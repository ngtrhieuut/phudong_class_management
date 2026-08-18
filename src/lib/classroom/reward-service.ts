import { createHash } from "node:crypto";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { notifyClassStaff } from "@/lib/teacher/notification-service";
import { operationalClassCondition } from "@/lib/classroom/access";
import { auditLogs, classes, classMemberships, classStudents, rewardRedemptions, rewards, scoreTransactions, studentScoreSnapshots, students, users } from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;
const redemptionSchema = z.object({ rewardId: z.string().uuid(), studentId: z.string().uuid(), classId: z.string().uuid() });
const transitionSchema = z.object({ status: z.enum(["requested", "approved", "fulfilled", "rejected", "cancelled"]) });

export type RewardRedemptionStatus = "requested" | "approved" | "fulfilled" | "rejected" | "cancelled";
export type RewardRedemptionTransition = z.infer<typeof transitionSchema>["status"];

const validTransitions: Record<RewardRedemptionStatus, readonly RewardRedemptionTransition[]> = {
  requested: ["approved", "rejected", "cancelled"],
  approved: ["fulfilled", "cancelled"],
  fulfilled: [],
  rejected: [],
  cancelled: [],
};

export function isValidRewardRedemptionTransition(
  currentStatus: RewardRedemptionStatus,
  nextStatus: RewardRedemptionTransition,
) {
  return validTransitions[currentStatus].includes(nextStatus);
}

export class RewardServiceError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "FORBIDDEN_CLASS_ACCESS" | "STUDENT_NOT_IN_CLASS" | "REWARD_NOT_AVAILABLE" | "INSUFFICIENT_BALANCE" | "NOT_FOUND" | "INVALID_STATUS", message: string) {
    super(message);
    this.name = "RewardServiceError";
  }
}

export async function redeemReward(input: unknown, actorUserId: string, idempotencyKey: string) {
  const parsed = redemptionSchema.safeParse(input);
  if (!parsed.success) throw new RewardServiceError("INVALID_INPUT", "Dữ liệu đổi quà không hợp lệ.");
  if (!idempotencyKey.trim() || idempotencyKey.length > 128) throw new RewardServiceError("INVALID_INPUT", "Thiếu mã idempotency cho thao tác đổi quà.");
  const fingerprint = createHash("sha256").update(JSON.stringify({ actorUserId, ...parsed.data })).digest("hex");
  return db.transaction(async (tx) => {
    const [access] = await tx.select({ organizationId: classes.organizationId }).from(classMemberships).innerJoin(users, eq(users.id, classMemberships.userId)).innerJoin(classes, eq(classes.id, classMemberships.classId)).where(and(eq(classMemberships.userId, actorUserId), eq(classMemberships.classId, parsed.data.classId), inArray(classMemberships.role, writeRoles), eq(users.status, "active"), operationalClassCondition())).limit(1);
    if (!access) throw new RewardServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền đổi quà cho lớp này.");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:reward-idempotency:${access.organizationId}:${idempotencyKey}`}, 0))`);
    const [previousAudit] = await tx.select({ afterJson: auditLogs.afterJson }).from(auditLogs).where(and(eq(auditLogs.organizationId, access.organizationId), eq(auditLogs.entityType, "reward_redemption_idempotency"), eq(auditLogs.entityId, idempotencyKey), eq(auditLogs.action, "created"))).limit(1);
    if (previousAudit) {
      const previous = previousAudit.afterJson as { requestFingerprint?: string; result?: { id: string } } | null;
      if (previous?.requestFingerprint !== fingerprint || !previous.result) throw new RewardServiceError("INVALID_INPUT", "Mã idempotency đã được dùng cho dữ liệu khác.");
      return previous.result;
    }
    const [member] = await tx.select({ studentId: classStudents.studentId }).from(classStudents).innerJoin(students, eq(students.id, classStudents.studentId)).where(and(eq(classStudents.classId, parsed.data.classId), eq(classStudents.studentId, parsed.data.studentId), isNull(classStudents.leftAt), eq(students.status, "active"), eq(students.organizationId, access.organizationId))).limit(1);
    if (!member) throw new RewardServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp này.");
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:reward:${parsed.data.classId}:${parsed.data.rewardId}`}, 0))`);
    const [reward] = await tx.select({ id: rewards.id, name: rewards.name, costStars: rewards.costStars, stock: rewards.stock }).from(rewards).where(and(eq(rewards.id, parsed.data.rewardId), eq(rewards.classId, parsed.data.classId), eq(rewards.active, true))).limit(1);
    if (!reward || reward.costStars <= 0 || (reward.stock !== null && reward.stock <= 0)) throw new RewardServiceError("REWARD_NOT_AVAILABLE", "Phần thưởng không còn khả dụng.");
    const [snapshot] = await tx.select({ spendableStars: studentScoreSnapshots.spendableStars }).from(studentScoreSnapshots).where(and(eq(studentScoreSnapshots.classId, parsed.data.classId), eq(studentScoreSnapshots.studentId, parsed.data.studentId))).limit(1);
    if (!snapshot || snapshot.spendableStars < reward.costStars) throw new RewardServiceError("INSUFFICIENT_BALANCE", "Số sao của học sinh không đủ.");
    const [redemption] = await tx.insert(rewardRedemptions).values({ rewardId: reward.id, studentId: parsed.data.studentId, classId: parsed.data.classId, costStars: reward.costStars, status: "requested" }).returning({ id: rewardRedemptions.id });
    const occurredAt = new Date();
    await tx.insert(scoreTransactions).values({ classId: parsed.data.classId, studentId: parsed.data.studentId, actorUserId, transactionType: "reward", lifetimeDelta: 0, spendableDelta: -reward.costStars, reason: `Đổi quà: ${reward.name}`, occurredAt });
    const [updatedSnapshot] = await tx.update(studentScoreSnapshots).set({ spendableStars: sql`${studentScoreSnapshots.spendableStars} - ${reward.costStars}`, updatedAt: occurredAt }).where(and(eq(studentScoreSnapshots.classId, parsed.data.classId), eq(studentScoreSnapshots.studentId, parsed.data.studentId), sql`${studentScoreSnapshots.spendableStars} >= ${reward.costStars}`)).returning({ id: studentScoreSnapshots.id });
    if (!updatedSnapshot) throw new RewardServiceError("INSUFFICIENT_BALANCE", "Số sao của học sinh không đủ.");
    if (reward.stock !== null) {
      const [updatedReward] = await tx.update(rewards).set({ stock: sql`${rewards.stock} - 1`, updatedAt: new Date() }).where(and(eq(rewards.id, reward.id), sql`${rewards.stock} > 0`)).returning({ id: rewards.id });
      if (!updatedReward) throw new RewardServiceError("REWARD_NOT_AVAILABLE", "Phần thưởng vừa hết số lượng.");
    }
    await tx.insert(auditLogs).values({ organizationId: access.organizationId, actorUserId, entityType: "reward_redemption", entityId: redemption.id, action: "requested", afterJson: { costStars: reward.costStars, rewardId: reward.id, studentId: parsed.data.studentId } });
    await tx.insert(auditLogs).values({ organizationId: access.organizationId, actorUserId, entityType: "reward_redemption_idempotency", entityId: idempotencyKey, action: "created", afterJson: { requestFingerprint: fingerprint, result: redemption } });
    await notifyClassStaff(tx, parsed.data.classId, "reward_redemption_requested");
    return redemption;
  });
}

export async function transitionRewardRedemption(redemptionId: string, input: unknown, actorUserId: string) {
  const parsedId = z.string().uuid().safeParse(redemptionId);
  const parsed = transitionSchema.safeParse(input);
  if (!parsedId.success || !parsed.success) throw new RewardServiceError("INVALID_INPUT", "Dữ liệu cập nhật đổi quà không hợp lệ.");

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:reward-redemption:${parsedId.data}`}, 0))`);

    const [redemption] = await tx
      .select({
        id: rewardRedemptions.id,
        classId: rewardRedemptions.classId,
        rewardId: rewardRedemptions.rewardId,
        rewardName: rewards.name,
        studentId: rewardRedemptions.studentId,
        costStars: rewardRedemptions.costStars,
        status: rewardRedemptions.status,
        organizationId: classes.organizationId,
      })
      .from(rewardRedemptions)
      .innerJoin(classes, eq(classes.id, rewardRedemptions.classId))
      .innerJoin(rewards, eq(rewards.id, rewardRedemptions.rewardId))
      .innerJoin(students, eq(students.id, rewardRedemptions.studentId))
      .where(and(eq(rewardRedemptions.id, parsedId.data), eq(students.organizationId, classes.organizationId)))
      .limit(1);
    if (!redemption) throw new RewardServiceError("NOT_FOUND", "Không tìm thấy yêu cầu đổi quà.");

    const [access] = await tx
      .select({ userId: classMemberships.userId })
      .from(classMemberships)
      .innerJoin(users, eq(users.id, classMemberships.userId))
      .innerJoin(classes, eq(classes.id, classMemberships.classId))
      .where(
        and(
          eq(classMemberships.userId, actorUserId),
          eq(classMemberships.classId, redemption.classId),
          inArray(classMemberships.role, writeRoles),
          eq(users.status, "active"),
          operationalClassCondition(),
        ),
      )
      .limit(1);
    if (!access) throw new RewardServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền xử lý yêu cầu đổi quà của lớp này.");

    if (!isValidRewardRedemptionTransition(redemption.status, parsed.data.status)) {
      throw new RewardServiceError("INVALID_STATUS", "Yêu cầu đổi quà không ở trạng thái phù hợp để cập nhật.");
    }

    const transitionedAt = new Date();
    const updateValues = (() => {
      switch (parsed.data.status) {
        case "approved":
          return { status: "approved" as const, approvedBy: actorUserId, updatedAt: transitionedAt };
        case "fulfilled":
          return { status: "fulfilled" as const, fulfilledAt: transitionedAt, updatedAt: transitionedAt };
        case "rejected":
          return { status: "rejected" as const, updatedAt: transitionedAt };
        case "cancelled":
          return { status: "cancelled" as const, updatedAt: transitionedAt };
        default:
          throw new RewardServiceError("INVALID_STATUS", "Yêu cầu đổi quà không ở trạng thái phù hợp để cập nhật.");
      }
    })();

    const refundsStars = parsed.data.status === "rejected" || parsed.data.status === "cancelled";
    if (refundsStars) {
      const [updatedSnapshot] = await tx
        .update(studentScoreSnapshots)
        .set({ spendableStars: sql`${studentScoreSnapshots.spendableStars} + ${redemption.costStars}`, updatedAt: transitionedAt })
        .where(and(eq(studentScoreSnapshots.classId, redemption.classId), eq(studentScoreSnapshots.studentId, redemption.studentId)))
        .returning({ id: studentScoreSnapshots.id });
      if (!updatedSnapshot) throw new RewardServiceError("INVALID_STATUS", "Không thể hoàn sao cho yêu cầu đổi quà này.");
      await tx.insert(scoreTransactions).values({
        classId: redemption.classId,
        studentId: redemption.studentId,
        actorUserId,
        transactionType: "reward",
        lifetimeDelta: 0,
        spendableDelta: redemption.costStars,
        reason: `Hoàn sao đổi quà: ${redemption.rewardName}`,
        occurredAt: transitionedAt,
      });
      await tx
        .update(rewards)
        .set({ stock: sql`${rewards.stock} + 1`, updatedAt: transitionedAt })
        .where(and(eq(rewards.id, redemption.rewardId), sql`${rewards.stock} is not null`));
    }
    const [updatedRedemption] = await tx
      .update(rewardRedemptions)
      .set(updateValues)
      .where(and(eq(rewardRedemptions.id, redemption.id), eq(rewardRedemptions.status, redemption.status)))
      .returning({ id: rewardRedemptions.id, status: rewardRedemptions.status });
    if (!updatedRedemption) throw new RewardServiceError("INVALID_STATUS", "Yêu cầu đổi quà vừa được cập nhật bởi thao tác khác.");

    await tx.insert(auditLogs).values({
      organizationId: redemption.organizationId,
      actorUserId,
      entityType: "reward_redemption",
      entityId: redemption.id,
      action: parsed.data.status,
      beforeJson: { status: redemption.status },
      afterJson: {
        status: parsed.data.status,
        costStars: redemption.costStars,
        rewardId: redemption.rewardId,
        studentId: redemption.studentId,
        refundedStars: refundsStars ? redemption.costStars : 0,
      },
    });

    return {
      id: updatedRedemption.id,
      previousStatus: redemption.status,
      status: updatedRedemption.status,
    };
  });
}
