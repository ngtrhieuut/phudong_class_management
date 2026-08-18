import { createHash } from "node:crypto";

import { and, eq, gte, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  behaviorTemplates,
  classes,
  classMemberships,
  classStudents,
  scoreTransactions,
  studentScoreSnapshots,
  students,
  users,
} from "@/db/schema";
import { calculateScoreDelta } from "@/lib/scoring";
import { getVietnamDayRange } from "@/lib/time/vietnam";

const scoreBatchInputSchema = z.object({
  classId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(100),
  behaviorTemplateId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(2000).optional(),
});

const scoreAdjustmentInputSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  sourceTransactionId: z.string().uuid(),
  lifetimeDelta: z.number().int().min(-10000).max(10000),
  spendableDelta: z.number().int().min(-10000).max(10000),
  reason: z.string().trim().min(1).max(500),
  note: z.string().trim().max(2000).optional(),
}).refine((value) => value.lifetimeDelta !== 0 || value.spendableDelta !== 0, {
  message: "Điều chỉnh phải thay đổi ít nhất một loại điểm.",
});

export type ScoreBatchInput = z.infer<typeof scoreBatchInputSchema>;
export type ScoreAdjustmentInput = z.infer<typeof scoreAdjustmentInputSchema>;

export class ScoreRecordingError extends Error {
  constructor(
    public readonly code:
    | "INVALID_INPUT"
    | "FORBIDDEN_CLASS_ACCESS"
    | "STUDENT_NOT_IN_CLASS"
    | "BEHAVIOR_NOT_AVAILABLE"
    | "SOURCE_TRANSACTION_NOT_FOUND"
    | "DAILY_LIMIT_REACHED"
    | "INSUFFICIENT_BALANCE"
    | "IDEMPOTENCY_CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "ScoreRecordingError";
  }
}

function uniqueStudentIds(studentIds: readonly string[]): string[] {
  return [...new Set(studentIds)];
}

function requestFingerprint(input: ScoreBatchInput, actorUserId: string): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        actorUserId,
        classId: input.classId,
        studentIds: [...input.studentIds].sort(),
        behaviorTemplateId: input.behaviorTemplateId,
        reason: input.reason ?? "",
        note: input.note ?? "",
      }),
    )
    .digest("hex");
}

function adjustmentFingerprint(input: ScoreAdjustmentInput): string {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export async function recordBehaviorScoreBatch(
  input: unknown,
  actorUserId: string,
  idempotencyKey: string,
) {
  const parsed = scoreBatchInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ScoreRecordingError("INVALID_INPUT", "Dữ liệu ghi nhận không hợp lệ.");
  }
  if (!idempotencyKey.trim() || idempotencyKey.length > 128) {
    throw new ScoreRecordingError("INVALID_INPUT", "Thiếu mã idempotency cho thao tác ghi nhận.");
  }

  const studentIds = uniqueStudentIds(parsed.data.studentIds);
  if (studentIds.length !== parsed.data.studentIds.length) {
    throw new ScoreRecordingError("INVALID_INPUT", "Danh sách học sinh bị trùng.");
  }

  try {
    return await db.transaction(async (tx) => {
      const [classAccess] = await tx
        .select({ classId: classes.id, organizationId: classes.organizationId })
        .from(classMemberships)
        .innerJoin(users, eq(users.id, classMemberships.userId))
        .innerJoin(classes, eq(classes.id, classMemberships.classId))
        .where(
          and(
            eq(classMemberships.userId, actorUserId),
            eq(classMemberships.classId, parsed.data.classId),
            inArray(classMemberships.role, ["homeroom_teacher", "teacher"]),
            eq(users.status, "active"),
          ),
        )
        .limit(1);

      if (!classAccess) {
        throw new ScoreRecordingError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền ghi nhận cho lớp này.");
      }

      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:score:${parsed.data.classId}`}, 0))`,
      );

      const fingerprint = requestFingerprint(parsed.data, actorUserId);
      const [previousAudit] = await tx
        .select({ afterJson: auditLogs.afterJson })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.organizationId, classAccess.organizationId),
            eq(auditLogs.entityType, "score_batch"),
            eq(auditLogs.entityId, idempotencyKey),
            eq(auditLogs.action, "created"),
          ),
        )
        .limit(1);
      if (previousAudit) {
        const previous = previousAudit.afterJson as { requestFingerprint?: string; result?: unknown } | null;
        if (previous?.requestFingerprint !== fingerprint || !previous.result) {
          throw new ScoreRecordingError("IDEMPOTENCY_CONFLICT", "Mã idempotency đã được dùng cho dữ liệu khác.");
        }
        return previous.result;
      }

      const members = await tx
        .select({ studentId: classStudents.studentId })
        .from(classStudents)
        .innerJoin(students, eq(students.id, classStudents.studentId))
        .where(
          and(
            eq(classStudents.classId, parsed.data.classId),
            inArray(classStudents.studentId, studentIds),
            isNull(classStudents.leftAt),
            eq(students.organizationId, classAccess.organizationId),
          ),
        );

      if (members.length !== studentIds.length) {
        throw new ScoreRecordingError("STUDENT_NOT_IN_CLASS", "Có học sinh không thuộc lớp đang chọn.");
      }

      const [behavior] = await tx
        .select({
          id: behaviorTemplates.id,
          name: behaviorTemplates.name,
          category: behaviorTemplates.category,
          defaultPoints: behaviorTemplates.defaultPoints,
          dailyLimit: behaviorTemplates.dailyLimit,
        })
        .from(behaviorTemplates)
        .where(
          and(
            eq(behaviorTemplates.id, parsed.data.behaviorTemplateId),
            eq(behaviorTemplates.active, true),
            or(
              eq(behaviorTemplates.classId, parsed.data.classId),
              and(
                isNull(behaviorTemplates.classId),
                eq(behaviorTemplates.organizationId, classAccess.organizationId),
              ),
            ),
          ),
        )
        .limit(1);

      if (!behavior) {
        throw new ScoreRecordingError("BEHAVIOR_NOT_AVAILABLE", "Hành vi này không còn khả dụng cho lớp.");
      }

      const delta = calculateScoreDelta({ category: behavior.category, points: behavior.defaultPoints });
      const occurredAt = new Date();

      if (behavior.dailyLimit !== null) {
        const { from: todayStart, to: tomorrowStart } = getVietnamDayRange(occurredAt);
        for (const studentId of studentIds) {
          const [{ count }] = await tx
            .select({ count: sql<number>`count(*)` })
            .from(scoreTransactions)
            .where(
              and(
                eq(scoreTransactions.classId, parsed.data.classId),
                eq(scoreTransactions.studentId, studentId),
                eq(scoreTransactions.behaviorTemplateId, behavior.id),
                gte(scoreTransactions.occurredAt, todayStart),
                sql`${scoreTransactions.occurredAt} < ${tomorrowStart}`,
              ),
            );
          if (Number(count) >= behavior.dailyLimit) {
            throw new ScoreRecordingError("DAILY_LIMIT_REACHED", "Hành vi này đã đạt giới hạn trong ngày.");
          }
        }
      }

      await tx.insert(scoreTransactions).values(
        studentIds.map((studentId) => ({
          classId: parsed.data.classId,
          studentId,
          behaviorTemplateId: behavior.id,
          actorUserId,
          transactionType: "behavior" as const,
          lifetimeDelta: delta.lifetimeDelta,
          spendableDelta: delta.spendableDelta,
          reason: parsed.data.reason || behavior.name,
          note: parsed.data.note || null,
          occurredAt,
        })),
      );

      for (const studentId of studentIds) {
        await tx
          .insert(studentScoreSnapshots)
          .values({
            studentId,
            classId: parsed.data.classId,
            lifetimeScore: delta.lifetimeDelta,
            spendableStars: delta.spendableDelta,
            updatedAt: occurredAt,
          })
          .onConflictDoUpdate({
            target: [studentScoreSnapshots.classId, studentScoreSnapshots.studentId],
            set: {
              lifetimeScore: sql`${studentScoreSnapshots.lifetimeScore} + ${delta.lifetimeDelta}`,
              spendableStars: sql`${studentScoreSnapshots.spendableStars} + ${delta.spendableDelta}`,
              updatedAt: occurredAt,
            },
          });
      }

      const batchId = crypto.randomUUID();
      const result = {
        batchId,
        recorded: studentIds.length,
        lifetimeDelta: delta.lifetimeDelta,
        spendableDelta: delta.spendableDelta,
      };
      await tx.insert(auditLogs).values({
        organizationId: classAccess.organizationId,
        actorUserId,
        entityType: "score_batch",
        entityId: idempotencyKey,
        action: "created",
        afterJson: {
          requestFingerprint: fingerprint,
          count: studentIds.length,
          behaviorTemplateId: behavior.id,
          lifetimeDelta: delta.lifetimeDelta,
          spendableDelta: delta.spendableDelta,
          result,
        },
      });

      return result;
    });
  } catch (error) {
    if (error instanceof ScoreRecordingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("student_score_snapshots") &&
      (message.includes("non_negative") || message.includes("check"))
    ) {
      throw new ScoreRecordingError("INSUFFICIENT_BALANCE", "Số sao có thể đổi không đủ cho ghi nhận này.");
    }
    throw error;
  }
}

export async function recordScoreAdjustment(
  input: unknown,
  actorUserId: string,
  idempotencyKey: string,
) {
  const parsed = scoreAdjustmentInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ScoreRecordingError("INVALID_INPUT", "Dữ liệu điều chỉnh điểm không hợp lệ.");
  }
  if (!idempotencyKey.trim() || idempotencyKey.length > 128) {
    throw new ScoreRecordingError("INVALID_INPUT", "Thiếu mã idempotency cho thao tác điều chỉnh.");
  }

  try {
    return await db.transaction(async (tx) => {
      const [classAccess] = await tx
        .select({ classId: classes.id, organizationId: classes.organizationId })
        .from(classMemberships)
        .innerJoin(users, eq(users.id, classMemberships.userId))
        .innerJoin(classes, eq(classes.id, classMemberships.classId))
        .where(
          and(
            eq(classMemberships.userId, actorUserId),
            eq(classMemberships.classId, parsed.data.classId),
            inArray(classMemberships.role, ["homeroom_teacher", "teacher"]),
            eq(users.status, "active"),
          ),
        )
        .limit(1);

      if (!classAccess) {
        throw new ScoreRecordingError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền điều chỉnh điểm cho lớp này.");
      }

      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:score:${parsed.data.classId}`}, 0))`,
      );

      const fingerprint = adjustmentFingerprint(parsed.data);
      const [previousAudit] = await tx
        .select({ afterJson: auditLogs.afterJson })
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.organizationId, classAccess.organizationId),
            eq(auditLogs.entityType, "score_adjustment"),
            eq(auditLogs.entityId, idempotencyKey),
            eq(auditLogs.action, "created"),
          ),
        )
        .limit(1);
      if (previousAudit) {
        const previous = previousAudit.afterJson as { requestFingerprint?: string; result?: unknown } | null;
        if (previous?.requestFingerprint !== fingerprint || !previous.result) {
          throw new ScoreRecordingError("IDEMPOTENCY_CONFLICT", "Mã idempotency đã được dùng cho dữ liệu khác.");
        }
        return previous.result;
      }

      const [member] = await tx
        .select({ studentId: classStudents.studentId })
        .from(classStudents)
        .innerJoin(students, eq(students.id, classStudents.studentId))
        .where(
          and(
            eq(classStudents.classId, parsed.data.classId),
            eq(classStudents.studentId, parsed.data.studentId),
            isNull(classStudents.leftAt),
            eq(students.organizationId, classAccess.organizationId),
          ),
        )
        .limit(1);
      if (!member) {
        throw new ScoreRecordingError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp này.");
      }

      const [sourceTransaction] = await tx
        .select({ id: scoreTransactions.id })
        .from(scoreTransactions)
        .where(
          and(
            eq(scoreTransactions.id, parsed.data.sourceTransactionId),
            eq(scoreTransactions.classId, parsed.data.classId),
            eq(scoreTransactions.studentId, parsed.data.studentId),
          ),
        )
        .limit(1);
      if (!sourceTransaction) {
        throw new ScoreRecordingError("SOURCE_TRANSACTION_NOT_FOUND", "Giao dịch gốc không thuộc học sinh/lớp này.");
      }

      const [snapshot] = await tx
        .select({
          id: studentScoreSnapshots.id,
          lifetimeScore: studentScoreSnapshots.lifetimeScore,
          spendableStars: studentScoreSnapshots.spendableStars,
        })
        .from(studentScoreSnapshots)
        .where(
          and(
            eq(studentScoreSnapshots.classId, parsed.data.classId),
            eq(studentScoreSnapshots.studentId, parsed.data.studentId),
          ),
        )
        .limit(1);
      const lifetimeScore = Number(snapshot?.lifetimeScore ?? 0);
      const spendableStars = Number(snapshot?.spendableStars ?? 0);
      if (
        lifetimeScore + parsed.data.lifetimeDelta < 0 ||
        spendableStars + parsed.data.spendableDelta < 0
      ) {
        throw new ScoreRecordingError("INSUFFICIENT_BALANCE", "Điều chỉnh sẽ làm số dư điểm bị âm.");
      }

      const occurredAt = new Date();
      const [transaction] = await tx
        .insert(scoreTransactions)
        .values({
          classId: parsed.data.classId,
          studentId: parsed.data.studentId,
          actorUserId,
          transactionType: "adjustment",
          lifetimeDelta: parsed.data.lifetimeDelta,
          spendableDelta: parsed.data.spendableDelta,
          reason: parsed.data.reason,
          note: parsed.data.note || null,
          sourceTransactionId: sourceTransaction.id,
          occurredAt,
        })
        .returning({ id: scoreTransactions.id });

      if (snapshot) {
        const [updatedSnapshot] = await tx
          .update(studentScoreSnapshots)
          .set({
            lifetimeScore: sql`${studentScoreSnapshots.lifetimeScore} + ${parsed.data.lifetimeDelta}`,
            spendableStars: sql`${studentScoreSnapshots.spendableStars} + ${parsed.data.spendableDelta}`,
            updatedAt: occurredAt,
          })
          .where(
            and(
              eq(studentScoreSnapshots.id, snapshot.id),
              sql`${studentScoreSnapshots.lifetimeScore} + ${parsed.data.lifetimeDelta} >= 0`,
              sql`${studentScoreSnapshots.spendableStars} + ${parsed.data.spendableDelta} >= 0`,
            ),
          )
          .returning({ id: studentScoreSnapshots.id });
        if (!updatedSnapshot) {
          throw new ScoreRecordingError("INSUFFICIENT_BALANCE", "Điều chỉnh sẽ làm số dư điểm bị âm.");
        }
      } else {
        await tx.insert(studentScoreSnapshots).values({
          studentId: parsed.data.studentId,
          classId: parsed.data.classId,
          lifetimeScore: parsed.data.lifetimeDelta,
          spendableStars: parsed.data.spendableDelta,
          updatedAt: occurredAt,
        });
      }

      const result = {
        transactionId: transaction.id,
        sourceTransactionId: sourceTransaction.id,
        lifetimeDelta: parsed.data.lifetimeDelta,
        spendableDelta: parsed.data.spendableDelta,
      };
      await tx.insert(auditLogs).values({
        organizationId: classAccess.organizationId,
        actorUserId,
        entityType: "score_adjustment",
        entityId: idempotencyKey,
        action: "created",
        afterJson: {
          requestFingerprint: fingerprint,
          classId: parsed.data.classId,
          studentId: parsed.data.studentId,
          sourceTransactionId: sourceTransaction.id,
          lifetimeDelta: parsed.data.lifetimeDelta,
          spendableDelta: parsed.data.spendableDelta,
          result,
        },
      });

      return result;
    });
  } catch (error) {
    if (error instanceof ScoreRecordingError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("student_score_snapshots") &&
      (message.includes("non_negative") || message.includes("check"))
    ) {
      throw new ScoreRecordingError("INSUFFICIENT_BALANCE", "Điều chỉnh sẽ làm số dư điểm bị âm.");
    }
    throw error;
  }
}
