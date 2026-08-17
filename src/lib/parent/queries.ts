import { and, asc, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  badgeDefinitions,
  classStudents,
  levelDefinitions,
  notifications,
  rewardRedemptions,
  rewards,
  schoolYears,
  scoreTransactions,
  studentBadges,
  studentGuardians,
  studentScoreSnapshots,
  students,
  taskAssignments,
  tasks,
  guardians,
  classes,
  users,
} from "@/db/schema";
import { getGuardianStudents } from "@/lib/classroom/queries";
import { getParentPraisePosts } from "@/lib/praise/queries";

export type ParentChild = Awaited<ReturnType<typeof getGuardianStudents>>[number];

export async function getParentChildren(userId: string) {
  return getGuardianStudents(userId);
}

async function assertGuardianChild(userId: string, studentId: string) {
  const [relation] = await db
    .select({ studentId: studentGuardians.studentId })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
    .where(
      and(
        eq(guardians.userId, userId),
        eq(users.status, "active"),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.canView, true),
      ),
    )
    .limit(1);
  if (!relation) throw new Error("FORBIDDEN_STUDENT_ACCESS");
}

export async function getParentChildData(userId: string, studentId: string) {
  await assertGuardianChild(userId, studentId);
  const [child] = await db
    .select({
      studentId: students.id,
      studentCode: students.studentCode,
      fullName: students.fullName,
      shortName: students.shortName,
      classId: classes.id,
      className: classes.name,
      schoolYearName: schoolYears.name,
      lifetimeScore: sql<number>`coalesce(${studentScoreSnapshots.lifetimeScore}, 0)`,
      spendableStars: sql<number>`coalesce(${studentScoreSnapshots.spendableStars}, 0)`,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
    .innerJoin(users, eq(users.id, guardians.userId))
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .innerJoin(classStudents, eq(classStudents.studentId, students.id))
    .innerJoin(classes, eq(classes.id, classStudents.classId))
    .innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId))
    .leftJoin(
      studentScoreSnapshots,
      and(eq(studentScoreSnapshots.studentId, students.id), eq(studentScoreSnapshots.classId, classes.id)),
    )
    .where(
      and(
        eq(guardians.userId, userId),
        eq(users.status, "active"),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.canView, true),
        isNull(classStudents.leftAt),
        eq(students.status, "active"),
      ),
    )
    .orderBy(desc(schoolYears.active), asc(classes.name))
    .limit(1);
  if (!child) throw new Error("FORBIDDEN_STUDENT_ACCESS");

  const [scores, tasksData, badges, levels, praise, guardianNotifications, redemptions] = await Promise.all([
    db
      .select({
        id: scoreTransactions.id,
        reason: scoreTransactions.reason,
        lifetimeDelta: scoreTransactions.lifetimeDelta,
        spendableDelta: scoreTransactions.spendableDelta,
        transactionType: scoreTransactions.transactionType,
        occurredAt: scoreTransactions.occurredAt,
      })
      .from(scoreTransactions)
      .where(and(eq(scoreTransactions.classId, child.classId), eq(scoreTransactions.studentId, studentId)))
      .orderBy(desc(scoreTransactions.occurredAt))
      .limit(50),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        rewardStars: tasks.rewardStars,
        taskStatus: taskAssignments.status,
        dueAt: tasks.dueAt,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
      .where(and(eq(taskAssignments.studentId, studentId), eq(tasks.classId, child.classId)))
      .orderBy(asc(tasks.dueAt))
      .limit(50),
    db
      .select({
        id: badgeDefinitions.id,
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
        iconUrl: badgeDefinitions.iconUrl,
        awardedAt: studentBadges.awardedAt,
      })
      .from(studentBadges)
      .innerJoin(badgeDefinitions, eq(badgeDefinitions.id, studentBadges.badgeId))
      .where(and(eq(studentBadges.classId, child.classId), eq(studentBadges.studentId, studentId)))
      .orderBy(desc(studentBadges.awardedAt))
      .limit(50),
    db
      .select({
        id: levelDefinitions.id,
        name: levelDefinitions.name,
        minScore: levelDefinitions.minScore,
        maxScore: levelDefinitions.maxScore,
        sortOrder: levelDefinitions.sortOrder,
      })
      .from(levelDefinitions)
      .where(or(eq(levelDefinitions.classId, child.classId), isNull(levelDefinitions.classId)))
      .orderBy(asc(levelDefinitions.sortOrder)),
    getParentPraisePosts(studentId),
    db
      .select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        deepLink: notifications.deepLink,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50),
    db
      .select({
        id: rewardRedemptions.id,
        rewardName: rewards.name,
        costStars: rewardRedemptions.costStars,
        status: rewardRedemptions.status,
        requestedAt: rewardRedemptions.requestedAt,
      })
      .from(rewardRedemptions)
      .innerJoin(rewards, eq(rewards.id, rewardRedemptions.rewardId))
      .where(and(eq(rewardRedemptions.classId, child.classId), eq(rewardRedemptions.studentId, studentId)))
      .orderBy(desc(rewardRedemptions.requestedAt))
      .limit(50),
  ]);

  return { child, scores, tasks: tasksData, badges, levels, praise, notifications: guardianNotifications, redemptions };
}

export { assertGuardianChild };
