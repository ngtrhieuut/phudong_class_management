import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classes,
  classRoles,
  classMemberships,
  classStudents,
  students,
  users,
} from "@/db/schema";
import { isAvatarPresetUrl } from "@/lib/avatar-presets";

const writeRoles = ["homeroom_teacher", "teacher"] as const;
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Ngày sinh không hợp lệ.");

const studentFieldsSchema = z.object({
  classId: z.string().uuid(),
  studentCode: z.string().trim().min(1).max(100),
  fullName: z.string().trim().min(1).max(200),
  birthDate: dateSchema.nullable().optional(),
  gender: z.enum(["male", "female", "other", "undisclosed"]).nullable().optional(),
  avatarUrl: z.string().trim().max(200).refine((value) => isAvatarPresetUrl(value), "Avatar không hợp lệ.").nullable().optional(),
  classRoleId: z.string().uuid().nullable().optional(),
  seatNo: z.number().int().min(1).max(200).nullable().optional(),
  groupName: z.string().trim().max(100).nullable().optional(),
});

const updateStudentSchema = studentFieldsSchema.extend({
  studentCode: studentFieldsSchema.shape.studentCode.optional(),
  fullName: studentFieldsSchema.shape.fullName.optional(),
});

export type StudentMutationInput = z.infer<typeof studentFieldsSchema>;

export class StudentServiceError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "FORBIDDEN_CLASS_ACCESS"
      | "STUDENT_NOT_IN_CLASS"
      | "DUPLICATE_CODE"
      | "SEAT_TAKEN"
      | "CLASS_ROLE_NOT_FOUND"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "StudentServiceError";
  }
}

async function getWriteAccess(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], actorUserId: string, classId: string) {
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
  if (!access) {
    throw new StudentServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền quản lý học sinh của lớp này.");
  }
  return access;
}

async function lockClass(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], classId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:student:${classId}`}, 0))`);
}

async function assertSeatAvailable(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  classId: string,
  seatNo: number | null | undefined,
  exceptStudentId?: string,
) {
  if (seatNo === null || seatNo === undefined) return;
  const [owner] = await tx
    .select({ studentId: classStudents.studentId })
    .from(classStudents)
    .where(
      and(
        eq(classStudents.classId, classId),
        eq(classStudents.seatNo, seatNo),
        isNull(classStudents.leftAt),
        exceptStudentId ? sql`${classStudents.studentId} <> ${exceptStudentId}` : undefined,
      ),
    )
    .limit(1);
  if (owner) {
    throw new StudentServiceError("SEAT_TAKEN", "Số thứ tự này đã được gán cho học sinh khác.");
  }
}

export async function createStudent(input: unknown, actorUserId: string) {
  const parsed = studentFieldsSchema.safeParse(input);
  if (!parsed.success) throw new StudentServiceError("INVALID_INPUT", "Dữ liệu học sinh không hợp lệ.");

  return db.transaction(async (tx) => {
    const access = await getWriteAccess(tx, actorUserId, parsed.data.classId);
    await lockClass(tx, parsed.data.classId);
    await assertSeatAvailable(tx, parsed.data.classId, parsed.data.seatNo);

    if (parsed.data.classRoleId) {
      const [role] = await tx
        .select({ id: classRoles.id })
        .from(classRoles)
        .where(and(eq(classRoles.id, parsed.data.classRoleId), eq(classRoles.classId, parsed.data.classId)))
        .limit(1);
      if (!role) throw new StudentServiceError("CLASS_ROLE_NOT_FOUND", "Chức vụ lớp không tồn tại trong lớp này.");
    }

    const [existingCode] = await tx
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.organizationId, access.organizationId), eq(students.studentCode, parsed.data.studentCode)))
      .limit(1);
    if (existingCode) {
      throw new StudentServiceError("DUPLICATE_CODE", "Mã học sinh đã tồn tại trong tổ chức.");
    }

    const [student] = await tx
      .insert(students)
      .values({
        organizationId: access.organizationId,
        studentCode: parsed.data.studentCode,
        fullName: parsed.data.fullName,
        birthDate: parsed.data.birthDate ?? null,
        gender: parsed.data.gender ?? null,
        avatarUrl: parsed.data.avatarUrl ?? null,
        status: "active",
      })
      .returning({ id: students.id, studentCode: students.studentCode, fullName: students.fullName });
    await tx.insert(classStudents).values({
      classId: parsed.data.classId,
      studentId: student.id,
      seatNo: parsed.data.seatNo ?? null,
      groupName: parsed.data.groupName ?? null,
      classRoleId: parsed.data.classRoleId ?? null,
    });
    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "student",
      entityId: student.id,
      action: "created",
      afterJson: { classId: parsed.data.classId, studentCode: student.studentCode, fullName: student.fullName },
    });
    return student;
  });
}

export async function updateStudent(input: unknown, studentId: string, actorUserId: string) {
  const parsed = updateStudentSchema.safeParse(input);
  if (!parsed.success) throw new StudentServiceError("INVALID_INPUT", "Dữ liệu học sinh không hợp lệ.");

  return db.transaction(async (tx) => {
    const access = await getWriteAccess(tx, actorUserId, parsed.data.classId);
    await lockClass(tx, parsed.data.classId);
    const [current] = await tx
      .select({
        id: students.id,
        organizationId: students.organizationId,
        studentCode: students.studentCode,
        fullName: students.fullName,
        birthDate: students.birthDate,
        gender: students.gender,
        avatarUrl: students.avatarUrl,
        seatNo: classStudents.seatNo,
        groupName: classStudents.groupName,
        classRoleId: classStudents.classRoleId,
      })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .where(and(eq(classStudents.classId, parsed.data.classId), eq(classStudents.studentId, studentId), isNull(classStudents.leftAt)))
      .limit(1);
    if (!current) throw new StudentServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp này.");
    if (current.organizationId !== access.organizationId) {
      throw new StudentServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc tổ chức của lớp này.");
    }

    await assertSeatAvailable(tx, parsed.data.classId, parsed.data.seatNo, studentId);
    let nextClassRoleId = current.classRoleId;
    if (parsed.data.classRoleId !== undefined) {
      if (parsed.data.classRoleId) {
        const [role] = await tx
          .select({ id: classRoles.id })
          .from(classRoles)
          .where(and(eq(classRoles.id, parsed.data.classRoleId), eq(classRoles.classId, parsed.data.classId)))
          .limit(1);
        if (!role) throw new StudentServiceError("CLASS_ROLE_NOT_FOUND", "Chức vụ lớp không tồn tại trong lớp này.");
      }
      nextClassRoleId = parsed.data.classRoleId;
    }
    const nextCode = parsed.data.studentCode ?? current.studentCode;
    if (nextCode !== current.studentCode) {
      const [existingCode] = await tx
        .select({ id: students.id })
        .from(students)
        .where(and(eq(students.organizationId, access.organizationId), eq(students.studentCode, nextCode), sql`${students.id} <> ${studentId}`))
        .limit(1);
      if (existingCode) throw new StudentServiceError("DUPLICATE_CODE", "Mã học sinh đã tồn tại trong tổ chức.");
    }

    const studentValues = {
      studentCode: nextCode,
      fullName: parsed.data.fullName ?? current.fullName,
      ...(parsed.data.birthDate !== undefined ? { birthDate: parsed.data.birthDate } : {}),
      ...(parsed.data.gender !== undefined ? { gender: parsed.data.gender } : {}),
      ...(parsed.data.avatarUrl !== undefined ? { avatarUrl: parsed.data.avatarUrl } : {}),
      updatedAt: new Date(),
    };
    await tx.update(students).set(studentValues).where(eq(students.id, studentId));
    await tx
      .update(classStudents)
      .set({
        seatNo: parsed.data.seatNo !== undefined ? parsed.data.seatNo : current.seatNo,
        groupName: parsed.data.groupName !== undefined ? parsed.data.groupName : current.groupName,
        ...(parsed.data.classRoleId !== undefined ? { classRoleId: nextClassRoleId } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(classStudents.classId, parsed.data.classId), eq(classStudents.studentId, studentId)));
    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "student",
      entityId: studentId,
      action: "updated",
      beforeJson: { studentCode: current.studentCode, fullName: current.fullName, seatNo: current.seatNo, groupName: current.groupName },
      afterJson: {
        classId: parsed.data.classId,
        ...studentValues,
        seatNo: parsed.data.seatNo !== undefined ? parsed.data.seatNo : current.seatNo,
        groupName: parsed.data.groupName !== undefined ? parsed.data.groupName : current.groupName,
        ...(parsed.data.classRoleId !== undefined ? { classRoleId: nextClassRoleId } : {}),
      },
    });
    return { id: studentId, ...studentValues };
  });
}

export async function archiveStudent(input: unknown, studentId: string, actorUserId: string) {
  const parsed = z.object({ classId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) throw new StudentServiceError("INVALID_INPUT", "Thiếu lớp của học sinh.");

  return db.transaction(async (tx) => {
    const access = await getWriteAccess(tx, actorUserId, parsed.data.classId);
    await lockClass(tx, parsed.data.classId);
    const [membership] = await tx
      .select({ id: classStudents.id })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .where(and(eq(classStudents.classId, parsed.data.classId), eq(classStudents.studentId, studentId), isNull(classStudents.leftAt)))
      .limit(1);
    if (!membership) throw new StudentServiceError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp này.");

    const leftAt = new Date();
    await tx.update(classStudents).set({ leftAt, updatedAt: leftAt }).where(eq(classStudents.id, membership.id));
    const [activeMembership] = await tx
      .select({ id: classStudents.id })
      .from(classStudents)
      .where(and(eq(classStudents.studentId, studentId), isNull(classStudents.leftAt)))
      .limit(1);
    if (!activeMembership) {
      await tx.update(students).set({ status: "archived", updatedAt: leftAt }).where(eq(students.id, studentId));
    }
    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "student",
      entityId: studentId,
      action: "archived",
      afterJson: { classId: parsed.data.classId, leftAt: leftAt.toISOString() },
    });
    return { id: studentId, archived: true };
  });
}
