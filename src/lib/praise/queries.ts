import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  classStudents,
  praisePostStudents,
  praisePosts,
  students,
} from "@/db/schema";
import { getTeacherClass } from "@/lib/classroom/queries";

export async function getTeacherPraiseFeed(userId: string, classId?: string) {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) return null;

  const posts = await db
    .select({
      id: praisePosts.id,
      classId: praisePosts.classId,
      title: praisePosts.title,
      body: praisePosts.body,
      visibility: praisePosts.visibility,
      createdAt: praisePosts.createdAt,
      updatedAt: praisePosts.updatedAt,
      studentNames: sql<string>`coalesce(string_agg(distinct ${students.fullName}, ', '), 'Lớp học')`,
    })
    .from(praisePosts)
    .leftJoin(praisePostStudents, eq(praisePostStudents.postId, praisePosts.id))
    .leftJoin(students, eq(students.id, praisePostStudents.studentId))
    .where(eq(praisePosts.classId, classContext.id))
    .groupBy(praisePosts.id)
    .orderBy(desc(praisePosts.createdAt));

  return { classContext, posts };
}

export async function getParentPraisePosts(studentId: string) {
  return db
    .select({
      id: praisePosts.id,
      classId: praisePosts.classId,
      title: praisePosts.title,
      body: praisePosts.body,
      visibility: praisePosts.visibility,
      createdAt: praisePosts.createdAt,
      studentNames: sql<string>`coalesce(string_agg(distinct ${students.fullName}, ', '), 'Lớp học')`,
    })
    .from(classStudents)
    .innerJoin(classes, eq(classes.id, classStudents.classId))
    .innerJoin(praisePosts, eq(praisePosts.classId, classStudents.classId))
    .leftJoin(praisePostStudents, eq(praisePostStudents.postId, praisePosts.id))
    .leftJoin(students, eq(students.id, praisePostStudents.studentId))
    .where(
      and(
        eq(classStudents.studentId, studentId),
        isNull(classStudents.leftAt),
        or(
          eq(praisePosts.visibility, "class"),
          and(eq(praisePosts.visibility, "related_guardians"), eq(praisePostStudents.studentId, studentId)),
        ),
      ),
    )
    .groupBy(praisePosts.id)
    .orderBy(desc(praisePosts.createdAt))
    .limit(50);
}
