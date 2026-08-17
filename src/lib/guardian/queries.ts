import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { classStudents, guardians, studentGuardians, students, users } from "@/db/schema";
import { getTeacherClass } from "@/lib/classroom/queries";

export async function getTeacherGuardianBoard(userId: string, classId?: string) {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) return null;

  const [studentRows, relationRows] = await Promise.all([
    db
      .select({ id: students.id, fullName: students.fullName, studentCode: students.studentCode })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .where(and(eq(classStudents.classId, classContext.id), isNull(classStudents.leftAt), eq(students.status, "active")))
      .orderBy(asc(students.fullName)),
    db
      .select({
        relationId: studentGuardians.id,
        studentId: studentGuardians.studentId,
        guardianId: studentGuardians.guardianId,
        guardianName: guardians.fullName,
        guardianEmail: guardians.email,
        guardianUserId: guardians.userId,
        guardianUserStatus: users.status,
        relationship: studentGuardians.relationship,
        canView: studentGuardians.canView,
        receivesNotifications: studentGuardians.receivesNotifications,
      })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .innerJoin(studentGuardians, eq(studentGuardians.studentId, classStudents.studentId))
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .leftJoin(users, eq(users.id, guardians.userId))
      .where(and(eq(classStudents.classId, classContext.id), isNull(classStudents.leftAt), eq(students.status, "active")))
      .orderBy(asc(students.fullName), asc(guardians.fullName)),
  ]);

  return { classContext, students: studentRows, relations: relationRows };
}
