import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classes,
  classMemberships,
  classStudents,
  guardians,
  studentGuardians,
  students,
  users,
} from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;

const linkInputSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  guardianEmail: z.string().trim().email().max(320),
  relationship: z.string().trim().min(1).max(100),
  canView: z.boolean().default(true),
  receivesNotifications: z.boolean().default(true),
});

const revokeInputSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  guardianId: z.string().uuid(),
});

export class GuardianServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "FORBIDDEN_CLASS_ACCESS"
      | "STUDENT_NOT_IN_CLASS"
      | "GUARDIAN_ACCOUNT_NOT_FOUND"
      | "RELATION_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "GuardianServiceError";
  }
}

async function getWritableClass(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  actorUserId: string,
  classId: string,
) {
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
  return access ?? null;
}

async function assertActiveStudentInClass(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  classId: string,
  studentId: string,
) {
  const [student] = await tx
    .select({ id: students.id, fullName: students.fullName })
    .from(classStudents)
    .innerJoin(students, eq(students.id, classStudents.studentId))
    .where(
      and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentId, studentId),
        isNull(classStudents.leftAt),
        eq(students.status, "active"),
      ),
    )
    .limit(1);
  return student ?? null;
}

export async function linkGuardian(input: unknown, actorUserId: string) {
  const parsed = linkInputSchema.safeParse(input);
  if (!parsed.success) throw new GuardianServiceError("INVALID_INPUT", "Dữ liệu liên kết phụ huynh không hợp lệ.");

  return db.transaction(async (tx) => {
    const access = await getWritableClass(tx, actorUserId, parsed.data.classId);
    if (!access) throw new GuardianServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền quản lý phụ huynh của lớp này.");

    const student = await assertActiveStudentInClass(tx, parsed.data.classId, parsed.data.studentId);
    if (!student) throw new GuardianServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp đang chọn.");

    const normalizedEmail = parsed.data.guardianEmail.toLowerCase();
    const [guardianUser] = await tx
      .select({ id: users.id, displayName: users.displayName, email: users.email })
      .from(users)
      .where(and(eq(users.email, normalizedEmail), eq(users.status, "active")))
      .limit(1);
    if (!guardianUser) {
      throw new GuardianServiceError(
        "GUARDIAN_ACCOUNT_NOT_FOUND",
        "Không tìm thấy tài khoản phụ huynh đang hoạt động. Phụ huynh cần đăng nhập ít nhất một lần trước khi liên kết.",
      );
    }

    let guardianId: string;
    const [existingGuardian] = await tx
      .select({ id: guardians.id })
      .from(guardians)
      .where(eq(guardians.userId, guardianUser.id))
      .limit(1);
    if (existingGuardian) {
      guardianId = existingGuardian.id;
      await tx
        .update(guardians)
        .set({ fullName: guardianUser.displayName, email: guardianUser.email ?? normalizedEmail, updatedAt: new Date() })
        .where(eq(guardians.id, guardianId));
    } else {
      const [createdGuardian] = await tx
        .insert(guardians)
        .values({
          userId: guardianUser.id,
          fullName: guardianUser.displayName,
          email: guardianUser.email ?? normalizedEmail,
        })
        .returning({ id: guardians.id });
      guardianId = createdGuardian.id;
    }

    const [existingRelation] = await tx
      .select({ id: studentGuardians.id })
      .from(studentGuardians)
      .where(and(eq(studentGuardians.studentId, student.id), eq(studentGuardians.guardianId, guardianId)))
      .limit(1);
    if (existingRelation) {
      await tx
        .update(studentGuardians)
        .set({
          relationship: parsed.data.relationship,
          canView: parsed.data.canView,
          receivesNotifications: parsed.data.receivesNotifications,
          updatedAt: new Date(),
        })
        .where(eq(studentGuardians.id, existingRelation.id));
    } else {
      await tx.insert(studentGuardians).values({
        studentId: student.id,
        guardianId,
        relationship: parsed.data.relationship,
        canView: parsed.data.canView,
        receivesNotifications: parsed.data.receivesNotifications,
      });
    }

    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "student_guardian",
      entityId: `${student.id}:${guardianId}`,
      action: existingRelation ? "updated" : "linked",
      afterJson: {
        studentId: student.id,
        guardianId,
        canView: parsed.data.canView,
        receivesNotifications: parsed.data.receivesNotifications,
      },
    });

    return { studentId: student.id, guardianId, linked: true };
  });
}

export async function revokeGuardian(input: unknown, actorUserId: string) {
  const parsed = revokeInputSchema.safeParse(input);
  if (!parsed.success) throw new GuardianServiceError("INVALID_INPUT", "Dữ liệu thu hồi liên kết không hợp lệ.");

  return db.transaction(async (tx) => {
    const access = await getWritableClass(tx, actorUserId, parsed.data.classId);
    if (!access) throw new GuardianServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền quản lý phụ huynh của lớp này.");
    const student = await assertActiveStudentInClass(tx, parsed.data.classId, parsed.data.studentId);
    if (!student) throw new GuardianServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp đang chọn.");

    const [relation] = await tx
      .select({ id: studentGuardians.id })
      .from(studentGuardians)
      .where(
        and(
          eq(studentGuardians.id, parsed.data.guardianId),
          eq(studentGuardians.studentId, parsed.data.studentId),
        ),
      )
      .limit(1);
    if (!relation) throw new GuardianServiceError("RELATION_NOT_FOUND", "Không tìm thấy liên kết phụ huynh.");

    await tx
      .update(studentGuardians)
      .set({ canView: false, receivesNotifications: false, updatedAt: new Date() })
      .where(eq(studentGuardians.id, relation.id));
    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "student_guardian",
      entityId: relation.id,
      action: "revoked",
      afterJson: { studentId: parsed.data.studentId, guardianId: parsed.data.guardianId },
    });
    return { relationId: relation.id, revoked: true };
  });
}
