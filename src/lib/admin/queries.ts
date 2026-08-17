import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { auditLogs, classes, classStudents, organizationMembers, organizations, users } from "@/db/schema";

export async function getAdminOverview(userId: string) {
  const organizationsForUser = await db
    .select({ id: organizations.id, name: organizations.name, code: organizations.code })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.role, "admin"), eq(users.status, "active")));
  if (organizationsForUser.length === 0) return null;
  const organizationIds = organizationsForUser.map((organization) => organization.id);
  const [classRows, memberRows, auditRows] = await Promise.all([
    db.select({ id: classes.id, organizationId: classes.organizationId, name: classes.name, grade: classes.grade, schoolYearId: classes.schoolYearId, studentCount: sql<number>`count(distinct ${classStudents.studentId})` }).from(classes).leftJoin(classStudents, and(eq(classStudents.classId, classes.id), sql`${classStudents.leftAt} is null`)).where(inArray(classes.organizationId, organizationIds)).groupBy(classes.id).orderBy(asc(classes.name)),
    db.select({ userId: organizationMembers.userId, displayName: users.displayName, email: users.email, organizationId: organizationMembers.organizationId, role: organizationMembers.role }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(inArray(organizationMembers.organizationId, organizationIds), eq(users.status, "active"))).orderBy(asc(users.displayName)),
    db.select({ id: auditLogs.id, entityType: auditLogs.entityType, action: auditLogs.action, createdAt: auditLogs.createdAt }).from(auditLogs).where(inArray(auditLogs.organizationId, organizationIds)).orderBy(desc(auditLogs.createdAt)).limit(50),
  ]);
  return { organizations: organizationsForUser, classes: classRows, members: memberRows, auditLogs: auditRows };
}
