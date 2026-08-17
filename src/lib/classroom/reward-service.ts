import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs, classes, classMemberships, classStudents, rewardRedemptions, rewards, scoreTransactions, studentScoreSnapshots, students, users } from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;
const redemptionSchema = z.object({ rewardId: z.string().uuid(), studentId: z.string().uuid(), classId: z.string().uuid() });

export class RewardServiceError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "FORBIDDEN_CLASS_ACCESS" | "STUDENT_NOT_IN_CLASS" | "REWARD_NOT_AVAILABLE" | "INSUFFICIENT_BALANCE", message: string) {
    super(message);
    this.name = "RewardServiceError";
  }
}

export async function redeemReward(input: unknown, actorUserId: string) {
  const parsed = redemptionSchema.safeParse(input);
  if (!parsed.success) throw new RewardServiceError("INVALID_INPUT", "Dữ liệu đổi quà không hợp lệ.");
  return db.transaction(async (tx) => {
    const [access] = await tx.select({ organizationId: classes.organizationId }).from(classMemberships).innerJoin(users, eq(users.id, classMemberships.userId)).innerJoin(classes, eq(classes.id, classMemberships.classId)).where(and(eq(classMemberships.userId, actorUserId), eq(classMemberships.classId, parsed.data.classId), inArray(classMemberships.role, writeRoles), eq(users.status, "active"))).limit(1);
    if (!access) throw new RewardServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền đổi quà cho lớp này.");
    const [member] = await tx.select({ studentId: classStudents.studentId }).from(classStudents).innerJoin(students, eq(students.id, classStudents.studentId)).where(and(eq(classStudents.classId, parsed.data.classId), eq(classStudents.studentId, parsed.data.studentId), isNull(classStudents.leftAt), eq(students.status, "active"))).limit(1);
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
    return redemption;
  });
}
