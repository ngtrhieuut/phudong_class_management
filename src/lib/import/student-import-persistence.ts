import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classMemberships,
  classRoles,
  classStudents,
  classes,
  guardians,
  schoolYears,
  studentGuardians,
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
    | "SEAT_COLLISION"
    | "STUDENT_STATUS_CONFLICT",
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
          inArray(classMemberships.role, ["homeroom_teacher", "teacher"]),
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

    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:student-import:${context.organizationId}`}, 0))`,
    );

    const roleRows = await tx
      .select({ id: classRoles.id, name: classRoles.name })
      .from(classRoles)
      .where(eq(classRoles.classId, context.classId));
    const roleIds = new Map(roleRows.map((role) => [normalizeRole(role.name), role.id]));

    const existingStudents = await tx
      .select({ id: students.id, studentCode: students.studentCode, fullName: students.fullName, status: students.status })
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
    let createdGuardians = 0;
    let updatedGuardians = 0;
    let createdGuardianLinks = 0;
    let updatedGuardianLinks = 0;

    async function upsertGuardian(studentId: string, fullName: string | undefined, relationship: string, phone: string | null) {
      const normalizedName = fullName?.trim();
      if (!normalizedName) return;

      // A guardian has no organization_id of its own. Resolve an existing
      // relation through the current organization's student graph first so a
      // teacher import can never attach a user account from another tenant by
      // matching only a common name/phone.
      const [existingRelation] = await tx
        .select({
          linkId: studentGuardians.id,
          guardianId: guardians.id,
          guardianUserId: guardians.userId,
        })
        .from(studentGuardians)
        .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
        .innerJoin(students, eq(students.id, studentGuardians.studentId))
        .where(
          and(
            eq(studentGuardians.studentId, studentId),
            eq(studentGuardians.relationship, relationship),
            eq(students.organizationId, context.organizationId),
          ),
        )
        .limit(1);

      if (existingRelation) {
        // Do not let a roster import rewrite an authenticated guardian's
        // identity. Teacher-maintained contact fields are safe to update only
        // for the local, not-yet-authenticated contact record.
        if (!existingRelation.guardianUserId) {
          await tx
            .update(guardians)
            .set({ fullName: normalizedName, phone, updatedAt: new Date() })
            .where(eq(guardians.id, existingRelation.guardianId));
          updatedGuardians += 1;
        }
        await tx
          .update(studentGuardians)
          .set({ relationship, updatedAt: new Date() })
          .where(eq(studentGuardians.id, existingRelation.linkId));
        updatedGuardianLinks += 1;
        return;
      }

      const [existingGuardian] = await tx
        .select({ id: guardians.id })
        .from(guardians)
        .innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
        .innerJoin(students, eq(students.id, studentGuardians.studentId))
        .where(
          and(
            eq(students.organizationId, context.organizationId),
            eq(guardians.fullName, normalizedName),
            phone ? eq(guardians.phone, phone) : isNull(guardians.phone),
          ),
        )
        .limit(1);
      let guardianId: string;
      if (existingGuardian) {
        guardianId = existingGuardian.id;
        if (phone) {
          await tx.update(guardians).set({ phone, updatedAt: new Date() }).where(eq(guardians.id, guardianId));
        }
        updatedGuardians += 1;
      } else {
        const [createdGuardian] = await tx
          .insert(guardians)
          .values({ fullName: normalizedName, phone })
          .returning({ id: guardians.id });
        guardianId = createdGuardian.id;
        createdGuardians += 1;
      }

      const [existingLink] = await tx
        .select({ id: studentGuardians.id })
        .from(studentGuardians)
        .where(and(eq(studentGuardians.studentId, studentId), eq(studentGuardians.guardianId, guardianId)))
        .limit(1);
      if (existingLink) {
        await tx.update(studentGuardians).set({ relationship, updatedAt: new Date() }).where(eq(studentGuardians.id, existingLink.id));
        updatedGuardianLinks += 1;
      } else {
        // Imported contacts are not authenticated relationships yet. Keep
        // access disabled until the teacher explicitly links/invites the
        // guardian account.
        await tx.insert(studentGuardians).values({
          studentId,
          guardianId,
          relationship,
          canView: false,
          receivesNotifications: false,
        });
        createdGuardianLinks += 1;
      }
    }

    for (const row of rows) {
      const existing = studentsByCode.get(row.studentCode);
      if (existing && normalizeName(existing.fullName) !== normalizeName(row.fullName)) {
        throw new StudentImportPersistenceError(
          "STUDENT_NAME_COLLISION",
          row.rowNumber,
          "Mã học sinh đã tồn tại với tên khác; cần đối chiếu thủ công.",
        );
      }
      if (existing && existing.status !== "active") {
        throw new StudentImportPersistenceError(
          "STUDENT_STATUS_CONFLICT",
          row.rowNumber,
          "Học sinh đã tồn tại nhưng không ở trạng thái active; cần đối chiếu thủ công.",
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

      const studentUpdateValues = {
        organizationId: context.organizationId,
        studentCode: row.studentCode,
        fullName: row.fullName,
        updatedAt: new Date(),
        ...(row.birthDate !== undefined ? { birthDate: row.birthDate } : {}),
        ...(row.gender !== undefined ? { gender: row.gender } : {}),
      };
      const studentInsertValues = {
        ...studentUpdateValues,
        birthDate: row.birthDate ?? null,
        gender: row.gender ?? null,
        status: "active" as const,
      };

      let studentId: string;
      if (existing) {
        const [updated] = await tx
          .update(students)
          .set(studentUpdateValues)
          .where(eq(students.id, existing.id))
          .returning({ id: students.id });
        studentId = updated.id;
        updatedStudents += 1;
      } else {
        const [created] = await tx.insert(students).values(studentInsertValues).returning({ id: students.id });
        studentId = created.id;
        studentsByCode.set(row.studentCode, {
          id: studentId,
          studentCode: row.studentCode,
          fullName: row.fullName,
          status: "active",
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
        const membershipValues = {
          seatNo: row.seatNumber ?? null,
          groupName: row.group ?? null,
          leftAt: null,
          updatedAt: new Date(),
          ...(row.classRole !== undefined ? { classRoleId: classRoleId ?? null } : {}),
        };
        await tx
          .update(classStudents)
          .set(membershipValues)
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

      const contactPhone = row.contactPhone?.trim() || null;
      await upsertGuardian(studentId, row.fatherName, "Cha", contactPhone);
      // The source workbook contains one household contact column, not a
      // separate father/mother phone. Keep the same contact number on both
      // named parent records so it is searchable without claiming it is a
      // personal number for only one parent.
      await upsertGuardian(studentId, row.motherName, "Mẹ", contactPhone);
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
        createdGuardians,
        updatedGuardians,
        createdGuardianLinks,
        updatedGuardianLinks,
      },
    });

    return {
      importId,
      totalRows: rows.length,
      createdStudents,
      updatedStudents,
      createdMemberships,
      updatedMemberships,
      createdGuardians,
      updatedGuardians,
      createdGuardianLinks,
      updatedGuardianLinks,
    };
  });
}
