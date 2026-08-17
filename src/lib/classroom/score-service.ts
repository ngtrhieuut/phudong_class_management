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
  users,
} from "@/db/schema";
import { calculateScoreDelta } from "@/lib/scoring";

const scoreBatchInputSchema = z.object({
  classId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(100),
  behaviorTemplateId: z.string().uuid(),
  reason: z.string().trim().max(500).optional(),
  note: z.string().trim().max(2000).optional(),
});

export type ScoreBatchInput = z.infer<typeof scoreBatchInputSchema>;

export class ScoreRecordingError extends Error {
  constructor(
    public readonly code:
    | "INVALID_INPUT"
    | "FORBIDDEN_CLASS_ACCESS"
    | "STUDENT_NOT_IN_CLASS"
    | "BEHAVIOR_NOT_AVAILABLE"
    | "DAILY_LIMIT_REACHED"
    | "INSUFFICIENT_BALANCE",
    message: string,
  ) {
    super(message);
    this.name = "ScoreRecordingError";
  }
}

function uniqueStudentIds(studentIds: readonly string[]): string[] {
  return [...new Set(studentIds)];
}

export async function recordBehaviorScoreBatch(input: unknown, actorUserId: string) {
  const parsed = scoreBatchInputSchema.safeParse(input);
  if (!parsed.success) {
    throw new ScoreRecordingError("INVALID_INPUT", "Dữ liệu ghi nhận không hợp lệ.");
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
            inArray(classMemberships.role, ["homeroom_teacher", "teacher", "assistant"]),
            eq(users.status, "active"),
          ),
        )
        .limit(1);

      if (!classAccess) {
        throw new ScoreRecordingError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền ghi nhận cho lớp này.");
      }

      const members = await tx
        .select({ studentId: classStudents.studentId })
        .from(classStudents)
        .where(
          and(
            eq(classStudents.classId, parsed.data.classId),
            inArray(classStudents.studentId, studentIds),
            isNull(classStudents.leftAt),
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
        const todayStart = new Date(occurredAt);
        todayStart.setHours(0, 0, 0, 0);
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
      await tx.insert(auditLogs).values({
        organizationId: classAccess.organizationId,
        actorUserId,
        entityType: "score_batch",
        entityId: batchId,
        action: "created",
        afterJson: {
          count: studentIds.length,
          behaviorTemplateId: behavior.id,
          lifetimeDelta: delta.lifetimeDelta,
          spendableDelta: delta.spendableDelta,
        },
      });

      return {
        batchId,
        recorded: studentIds.length,
        lifetimeDelta: delta.lifetimeDelta,
        spendableDelta: delta.spendableDelta,
      };
    });
  } catch (error) {
    if (error instanceof ScoreRecordingError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "";
    if (message.includes("student_score_snapshots") && message.includes("non_negative")) {
      throw new ScoreRecordingError("INSUFFICIENT_BALANCE", "Số sao có thể đổi không đủ cho ghi nhận này.");
    }
    throw error;
  }
}
