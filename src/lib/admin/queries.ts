import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs, badgeDefinitions, behaviorTemplates, classes, classStudents, guardians, levelDefinitions, organizationMembers, organizations, rewards, schoolYears, studentGuardians, students, users } from "@/db/schema";

export async function getAdminOverview(userId: string, filters: { entityType?: string; action?: string } = {}) {
  const organizationsForUser = await db
    .select({ id: organizations.id, name: organizations.name, code: organizations.code })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.role, "admin"), eq(users.status, "active")));
  if (organizationsForUser.length === 0) return null;
  const organizationIds = organizationsForUser.map((organization) => organization.id);
  const entityType = filters.entityType?.trim().slice(0, 100) || undefined;
  const action = filters.action?.trim().slice(0, 100) || undefined;
  const [classRows, memberRows, auditRows, studentTotal, guardianTotal, behaviorTotal, levelTotal, badgeTotal, rewardTotal, schoolYearRows] = await Promise.all([
    db.select({ id: classes.id, organizationId: classes.organizationId, name: classes.name, grade: classes.grade, schoolYearId: classes.schoolYearId, settingsJson: classes.settingsJson, studentCount: sql<number>`count(distinct ${classStudents.studentId})` }).from(classes).leftJoin(classStudents, and(eq(classStudents.classId, classes.id), sql`${classStudents.leftAt} is null`)).where(inArray(classes.organizationId, organizationIds)).groupBy(classes.id).orderBy(asc(classes.name)),
    db.select({ userId: organizationMembers.userId, displayName: users.displayName, email: users.email, organizationId: organizationMembers.organizationId, role: organizationMembers.role }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(inArray(organizationMembers.organizationId, organizationIds), eq(users.status, "active"))).orderBy(asc(users.displayName)),
    db.select({ id: auditLogs.id, entityType: auditLogs.entityType, entityId: auditLogs.entityId, action: auditLogs.action, actorName: users.displayName, createdAt: auditLogs.createdAt }).from(auditLogs).innerJoin(users, eq(users.id, auditLogs.actorUserId)).where(and(inArray(auditLogs.organizationId, organizationIds), entityType ? eq(auditLogs.entityType, entityType) : undefined, action ? eq(auditLogs.action, action) : undefined)).orderBy(desc(auditLogs.createdAt)).limit(50),
    db.select({ total: sql<number>`count(distinct ${classStudents.studentId})` }).from(classes).innerJoin(classStudents, and(eq(classStudents.classId, classes.id), sql`${classStudents.leftAt} is null`)).where(inArray(classes.organizationId, organizationIds)),
    db.select({ total: sql<number>`count(distinct ${guardians.id})` }).from(guardians).innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id)).innerJoin(students, eq(students.id, studentGuardians.studentId)).where(inArray(students.organizationId, organizationIds)),
    db.select({ total: sql<number>`count(${behaviorTemplates.id})` }).from(behaviorTemplates).where(inArray(behaviorTemplates.organizationId, organizationIds)),
    db.select({ total: sql<number>`count(${levelDefinitions.id})` }).from(levelDefinitions).innerJoin(classes, eq(classes.id, levelDefinitions.classId)).where(inArray(classes.organizationId, organizationIds)),
    db.select({ total: sql<number>`count(${badgeDefinitions.id})` }).from(badgeDefinitions).innerJoin(classes, eq(classes.id, badgeDefinitions.classId)).where(inArray(classes.organizationId, organizationIds)),
    db.select({ total: sql<number>`count(${rewards.id})` }).from(rewards).innerJoin(classes, eq(classes.id, rewards.classId)).where(inArray(classes.organizationId, organizationIds)),
    db.select({ id: schoolYears.id, organizationId: schoolYears.organizationId, name: schoolYears.name, startsAt: schoolYears.startsAt, endsAt: schoolYears.endsAt, active: schoolYears.active }).from(schoolYears).where(inArray(schoolYears.organizationId, organizationIds)).orderBy(desc(schoolYears.active), desc(schoolYears.startsAt)),
  ]);
  return { organizations: organizationsForUser, classes: classRows, members: memberRows, schoolYears: schoolYearRows, auditLogs: auditRows, studentCount: Number(studentTotal[0]?.total ?? 0), guardianCount: Number(guardianTotal[0]?.total ?? 0), configuration: { behaviors: Number(behaviorTotal[0]?.total ?? 0), levels: Number(levelTotal[0]?.total ?? 0), badges: Number(badgeTotal[0]?.total ?? 0), rewards: Number(rewardTotal[0]?.total ?? 0) }, filters: { entityType, action } };
}
