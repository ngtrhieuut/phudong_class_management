import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classMemberships,
  classRoles,
  classStudents,
  classes,
  schoolYears,
  students,
  users,
} from "@/db/schema";
import {
  type StudentImportPlan,
  normalizeStudentCode,
} from "@/lib/import/student-import";

const importContextSchema = z.object({
  organizationId: z.string().uuid(),
  schoolYearId: z.string().uuid(),
  classId: z.string().uuid(),
  className: z.string().trim().max(200).optional(),
});

export class StudentImportPersistenceError extends Error {
  constructor(
    public readonly code:
    | "INVALID_CONTEXT"
    | "FORBIDDEN_CLASS_ACCESS"
    | "CLASS_CONTEXT_MISMATCH"
    | "STUDENT_NAME_COLLISION"
    | "DUPLICATE_EXISTING_CODE"
    | "CLASS_ROLE_NOT_FOUND"
    | "SEAT_COLLISION",
    public readonly rowNumber?: number,
    message = "Không thể cập nhật danh sách học sinh.",
  ) {
    super(message);
    this.name = "StudentImportPersistenceError";
  }
}

function normalizeName(value: string): string {
  return value
    .replace(/đ/gi, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\s+/g, " ");
}

function normalizeRole(value: string): string {
  return normalizeName(value);
}

export async function persistStudentImportPlan(plan: StudentImportPlan, actorUserId: string) {
  const contextResult = importContextSchema.safeParse(plan.context);
  if (!contextResult.success || plan.summary.status !== "ready") {
    throw new StudentImportPersistenceError("INVALID_CONTEXT", undefined, "Bản xem trước danh sách chưa hợp lệ.");
  }

  const context = contextResult.data;
  const rows = [...plan.normalizedRows];
  const importId = crypto.randomUUID();

  return db.transaction(async (tx) => {
    const [access] = await tx
      .select({ organizationId: classes.organizationId })
      .from(classMemberships)
      .innerJoin(users, eq(users.id, classMemberships.userId))
      .innerJoin(classes, eq(classes.id, classMemberships.classId))
      .where(
        and(
          eq(classMemberships.userId, actorUserId),
          eq(classMemberships.classId, context.classId),
          inArray(classMemberships.role, ["homeroom_teacher", "teacher", "assistant"]),
          eq(users.status, "active"),
        ),
      )
      .limit(1);

    if (!access) {
      throw new StudentImportPersistenceError("FORBIDDEN_CLASS_ACCESS");
    }

    const [classContext] = await tx
      .select({
        organizationId: classes.organizationId,
        schoolYearId: classes.schoolYearId,
        className: classes.name,
      })
      .from(classes)
      .innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId))
      .where(
        and(
          eq(classes.id, context.classId),
          eq(classes.organizationId, context.organizationId),
          eq(classes.schoolYearId, context.schoolYearId),
        ),
      )
      .limit(1);

    if (!classContext || (context.className && normalizeName(context.className) !== normalizeName(classContext.className))) {
      throw new StudentImportPersistenceError("CLASS_CONTEXT_MISMATCH");
    }

    const roleRows = await tx
      .select({ id: classRoles.id, name: classRoles.name })
      .from(classRoles)
      .where(eq(classRoles.classId, context.classId));
    const roleIds = new Map(roleRows.map((role) => [normalizeRole(role.name), role.id]));

    const existingStudents = await tx
      .select({ id: students.id, studentCode: students.studentCode, fullName: students.fullName })
      .from(students)
      .where(eq(students.organizationId, context.organizationId));
    const studentsByCode = new Map<string, (typeof existingStudents)[number]>();
    for (const existing of existingStudents) {
      const normalizedCode = normalizeStudentCode(existing.studentCode);
      if (studentsByCode.has(normalizedCode)) {
        throw new StudentImportPersistenceError("DUPLICATE_EXISTING_CODE");
      }
      studentsByCode.set(normalizedCode, existing);
    }

    const activeMemberships = await tx
      .select({ studentId: classStudents.studentId, seatNo: classStudents.seatNo })
      .from(classStudents)
      .where(and(eq(classStudents.classId, context.classId), isNull(classStudents.leftAt)));
    const seatOwners = new Map<number, string>();
    for (const membership of activeMemberships) {
      if (membership.seatNo !== null) seatOwners.set(membership.seatNo, membership.studentId);
    }

    let createdStudents = 0;
    let updatedStudents = 0;
    let createdMemberships = 0;
    let updatedMemberships = 0;

    for (const row of rows) {
      const existing = studentsByCode.get(row.studentCode);
      if (existing && normalizeName(existing.fullName) !== normalizeName(row.fullName)) {
        throw new StudentImportPersistenceError(
          "STUDENT_NAME_COLLISION",
          row.rowNumber,
          "Mã học sinh đã tồn tại với tên khác; cần đối chiếu thủ công.",
        );
      }

      const classRoleId = row.classRole ? roleIds.get(normalizeRole(row.classRole)) : undefined;
      if (row.classRole && !classRoleId) {
        throw new StudentImportPersistenceError(
          "CLASS_ROLE_NOT_FOUND",
          row.rowNumber,
          "Chức vụ lớp trong file chưa được cấu hình cho lớp này.",
        );
      }

      const studentValues = {
        organizationId: context.organizationId,
        studentCode: row.studentCode,
        fullName: row.fullName,
        birthDate: row.birthDate ?? null,
        gender: row.gender ?? null,
        status: "active" as const,
        updatedAt: new Date(),
      };

      let studentId: string;
      if (existing) {
        const [updated] = await tx
          .update(students)
          .set(studentValues)
          .where(eq(students.id, existing.id))
          .returning({ id: students.id });
        studentId = updated.id;
        updatedStudents += 1;
      } else {
        const [created] = await tx.insert(students).values(studentValues).returning({ id: students.id });
        studentId = created.id;
        studentsByCode.set(row.studentCode, {
          id: studentId,
          studentCode: row.studentCode,
          fullName: row.fullName,
        });
        createdStudents += 1;
      }

      if (row.seatNumber !== undefined) {
        const owner = seatOwners.get(row.seatNumber);
        if (owner && owner !== studentId) {
          throw new StudentImportPersistenceError(
            "SEAT_COLLISION",
            row.rowNumber,
            "Số ghế đã được gán cho học sinh khác trong lớp.",
          );
        }
        seatOwners.set(row.seatNumber, studentId);
      }

      const [membership] = await tx
        .select({ id: classStudents.id })
        .from(classStudents)
        .where(and(eq(classStudents.classId, context.classId), eq(classStudents.studentId, studentId)))
        .limit(1);

      if (membership) {
        await tx
          .update(classStudents)
          .set({
            seatNo: row.seatNumber ?? null,
            groupName: row.group ?? null,
            classRoleId: classRoleId ?? null,
            leftAt: null,
            updatedAt: new Date(),
          })
          .where(eq(classStudents.id, membership.id));
        updatedMemberships += 1;
      } else {
        await tx.insert(classStudents).values({
          classId: context.classId,
          studentId,
          seatNo: row.seatNumber ?? null,
          groupName: row.group ?? null,
          classRoleId: classRoleId ?? null,
        });
        createdMemberships += 1;
      }
    }

    await tx.insert(auditLogs).values({
      organizationId: context.organizationId,
      actorUserId,
      entityType: "student_import",
      entityId: importId,
      action: "committed",
      afterJson: {
        totalRows: rows.length,
        createdStudents,
        updatedStudents,
        createdMemberships,
        updatedMemberships,
      },
    });

    return {
      importId,
      totalRows: rows.length,
      createdStudents,
      updatedStudents,
      createdMemberships,
      updatedMemberships,
    };
  });
}
