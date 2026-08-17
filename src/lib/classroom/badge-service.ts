import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs, badgeDefinitions, classes, classMemberships, classStudents, studentBadges, students, users } from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;
const awardSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  badgeId: z.string().uuid(),
  reason: z.string().trim().max(500).nullable().optional(),
});

export class BadgeServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "FORBIDDEN_CLASS_ACCESS"
      | "STUDENT_NOT_IN_CLASS"
      | "BADGE_NOT_AVAILABLE"
      | "ALREADY_AWARDED",
    message: string,
  ) {
    super(message);
    this.name = "BadgeServiceError";
  }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function assertClassAccess(tx: Transaction, actorUserId: string, classId: string) {
  const [access] = await tx
    .select({ organizationId: classes.organizationId })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .where(
      and(
        eq(classMemberships.userId, actorUserId),
        eq(classMemberships.classId, classId),
        inArray(classMemberships.role, writeRoles),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  if (!access) throw new BadgeServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền trao huy hiệu cho lớp này.");
  return access;
}

export async function awardBadge(input: unknown, actorUserId: string) {
  const parsed = awardSchema.safeParse(input);
  if (!parsed.success) throw new BadgeServiceError("INVALID_INPUT", "Dữ liệu trao huy hiệu không hợp lệ.");

  return db.transaction(async (tx) => {
    const access = await assertClassAccess(tx, actorUserId, parsed.data.classId);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:badge:${parsed.data.classId}:${parsed.data.studentId}`}, 0))`);

    const [member] = await tx
      .select({ studentId: classStudents.studentId })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .where(
        and(
          eq(classStudents.classId, parsed.data.classId),
          eq(classStudents.studentId, parsed.data.studentId),
          isNull(classStudents.leftAt),
          eq(students.status, "active"),
        ),
      )
      .limit(1);
    if (!member) throw new BadgeServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp này.");

    const [badge] = await tx
      .select({ id: badgeDefinitions.id, name: badgeDefinitions.name })
      .from(badgeDefinitions)
      .where(
        and(
          eq(badgeDefinitions.id, parsed.data.badgeId),
          eq(badgeDefinitions.active, true),
          or(eq(badgeDefinitions.classId, parsed.data.classId), isNull(badgeDefinitions.classId)),
        ),
      )
      .limit(1);
    if (!badge) throw new BadgeServiceError("BADGE_NOT_AVAILABLE", "Huy hiệu không khả dụng cho lớp này.");

    const [studentBadge] = await tx
      .insert(studentBadges)
      .values({
        classId: parsed.data.classId,
        studentId: parsed.data.studentId,
        badgeId: badge.id,
        awardedBy: actorUserId,
        reason: parsed.data.reason || null,
      })
      .onConflictDoNothing({ target: [studentBadges.studentId, studentBadges.classId, studentBadges.badgeId] })
      .returning({ id: studentBadges.id });
    if (!studentBadge) throw new BadgeServiceError("ALREADY_AWARDED", "Học sinh đã có huy hiệu này.");

    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "student_badge",
      entityId: studentBadge.id,
      action: "awarded",
      afterJson: {
        classId: parsed.data.classId,
        studentId: parsed.data.studentId,
        badgeId: badge.id,
        badgeName: badge.name,
        reason: parsed.data.reason || null,
      },
    });

    return studentBadge;
  });
}
