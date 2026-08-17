import { and, desc, eq, isNull, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  classes,
  classStudents,
  mediaAssets,
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
      media: sql<Array<{ id: string; mimeType: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('id', ${mediaAssets.id}, 'mimeType', ${mediaAssets.mimeType})) filter (where ${mediaAssets.id} is not null), '[]'::jsonb)`,
    })
    .from(praisePosts)
    .leftJoin(praisePostStudents, eq(praisePostStudents.postId, praisePosts.id))
    .leftJoin(students, eq(students.id, praisePostStudents.studentId))
    .leftJoin(mediaAssets, and(eq(mediaAssets.ownerType, "praise_post"), eq(mediaAssets.ownerId, praisePosts.id)))
    .where(eq(praisePosts.classId, classContext.id))
    .groupBy(praisePosts.id)
    .orderBy(desc(praisePosts.createdAt));

  return { classContext, posts };
}

export async function getParentPraisePosts(childStudentId: string) {
  return db
    .select({
      id: praisePosts.id,
      classId: praisePosts.classId,
      title: praisePosts.title,
      body: praisePosts.body,
      visibility: praisePosts.visibility,
      createdAt: praisePosts.createdAt,
      studentNames: sql<string>`coalesce(string_agg(distinct ${students.fullName}, ', '), 'Lớp học')`,
      media: sql<Array<{ id: string; mimeType: string }>>`coalesce(jsonb_agg(distinct jsonb_build_object('id', ${mediaAssets.id}, 'mimeType', ${mediaAssets.mimeType})) filter (where ${mediaAssets.id} is not null), '[]'::jsonb)`,
    })
    .from(classStudents)
    .innerJoin(classes, eq(classes.id, classStudents.classId))
    .innerJoin(praisePosts, eq(praisePosts.classId, classStudents.classId))
    .leftJoin(
      praisePostStudents,
      and(
        eq(praisePostStudents.postId, praisePosts.id),
        eq(praisePostStudents.studentId, childStudentId),
      ),
    )
    .leftJoin(students, eq(students.id, praisePostStudents.studentId))
    .leftJoin(mediaAssets, and(eq(mediaAssets.ownerType, "praise_post"), eq(mediaAssets.ownerId, praisePosts.id)))
    .where(
      and(
        eq(classStudents.studentId, childStudentId),
        isNull(classStudents.leftAt),
        or(
          eq(praisePosts.visibility, "class"),
          and(eq(praisePosts.visibility, "related_guardians"), eq(praisePostStudents.studentId, childStudentId)),
        ),
      ),
    )
    .groupBy(praisePosts.id)
    .orderBy(desc(praisePosts.createdAt))
    .limit(50);
}
