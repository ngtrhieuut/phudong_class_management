import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { operationalClassCondition } from "@/lib/classroom/access";
import {
  auditLogs,
  classes,
  classMemberships,
  classStudents,
  guardians,
  notifications,
  praisePostStudents,
  praisePosts,
  studentGuardians,
  students,
  users,
} from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;
const praiseInputSchema = z.object({
  classId: z.string().uuid(),
  studentIds: z.array(z.string().uuid()).min(1).max(100),
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(10000),
  visibility: z.enum(["class", "related_guardians", "teacher_only"]).default("class"),
});

export class PraiseServiceError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "FORBIDDEN_CLASS_ACCESS" | "STUDENT_NOT_IN_CLASS" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "PraiseServiceError";
  }
}

async function getWritableClass(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], userId: string, classId: string) {
  const [classAccess] = await tx
    .select({ classId: classes.id, organizationId: classes.organizationId })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .where(
      and(
        eq(classMemberships.userId, userId),
        eq(classMemberships.classId, classId),
        inArray(classMemberships.role, writeRoles),
        eq(users.status, "active"),
        operationalClassCondition(),
      ),
    )
    .limit(1);
  return classAccess ?? null;
}

export async function createPraisePost(input: unknown, authorUserId: string) {
  const parsed = praiseInputSchema.safeParse(input);
  if (!parsed.success || new Set(parsed.data.studentIds).size !== parsed.data.studentIds.length) {
    throw new PraiseServiceError("INVALID_INPUT", "Dữ liệu tuyên dương không hợp lệ.");
  }

  return db.transaction(async (tx) => {
    const classAccess = await getWritableClass(tx, authorUserId, parsed.data.classId);
    if (!classAccess) throw new PraiseServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền đăng tuyên dương cho lớp này.");

    const memberRows = await tx
      .select({ studentId: classStudents.studentId })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .where(
        and(
          eq(classStudents.classId, parsed.data.classId),
          inArray(classStudents.studentId, parsed.data.studentIds),
          isNull(classStudents.leftAt),
          eq(students.status, "active"),
          eq(students.organizationId, classAccess.organizationId),
        ),
      );
    if (memberRows.length !== parsed.data.studentIds.length) {
      throw new PraiseServiceError("STUDENT_NOT_IN_CLASS", "Có học sinh không thuộc lớp đang chọn.");
    }

    const [post] = await tx
      .insert(praisePosts)
      .values({
        classId: parsed.data.classId,
        authorUserId,
        title: parsed.data.title,
        body: parsed.data.body,
        visibility: parsed.data.visibility,
      })
      .returning({ id: praisePosts.id });

    await tx.insert(praisePostStudents).values(
      parsed.data.studentIds.map((studentId) => ({ postId: post.id, studentId })),
    );

    // Parent feed and media are intentionally child-isolated. A multi-student
    // post stays teacher-visible but must not create a parent notification that
    // points to a post the parent cannot safely inspect.
    if (parsed.data.visibility !== "teacher_only" && parsed.data.studentIds.length === 1) {
      const guardianRows = await tx
        .select({ userId: guardians.userId })
        .from(studentGuardians)
        .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
        .innerJoin(users, eq(users.id, guardians.userId))
        .where(
          and(
            inArray(studentGuardians.studentId, parsed.data.studentIds),
            eq(studentGuardians.canView, true),
            eq(studentGuardians.receivesNotifications, true),
            eq(users.status, "active"),
          ),
        );
      const uniqueGuardianIds = [...new Set(guardianRows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
      if (uniqueGuardianIds.length > 0) {
        await tx.insert(notifications).values(
          uniqueGuardianIds.map((userId) => ({
            userId,
            type: "praise_post",
            title: "Lớp học vừa có lời tuyên dương mới",
            body: parsed.data.title,
            deepLink: `/parent/praise?post=${post.id}`,
          })),
        );
      }
    }

    await tx.insert(auditLogs).values({
      organizationId: classAccess.organizationId,
      actorUserId: authorUserId,
      entityType: "praise_post",
      entityId: post.id,
      action: "created",
      afterJson: {
        studentCount: parsed.data.studentIds.length,
        visibility: parsed.data.visibility,
      },
    });

    return post;
  });
}

export async function setPraiseVisibility(postId: string, visibility: "class" | "related_guardians" | "teacher_only", actorUserId: string) {
  return db.transaction(async (tx) => {
    const [post] = await tx
      .select({ id: praisePosts.id, classId: praisePosts.classId, organizationId: classes.organizationId })
      .from(praisePosts)
      .innerJoin(classes, eq(classes.id, praisePosts.classId))
      .where(eq(praisePosts.id, postId))
      .limit(1);
    if (!post) throw new PraiseServiceError("NOT_FOUND", "Không tìm thấy bài tuyên dương.");
    const access = await getWritableClass(tx, actorUserId, post.classId);
    if (!access) throw new PraiseServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền chỉnh bài tuyên dương này.");

    await tx.update(praisePosts).set({ visibility, updatedAt: new Date() }).where(eq(praisePosts.id, postId));
    await tx.insert(auditLogs).values({
      organizationId: post.organizationId,
      actorUserId,
      entityType: "praise_post",
      entityId: postId,
      action: visibility === "teacher_only" ? "unpublished" : "published",
      afterJson: { visibility },
    });
    return { id: postId, visibility };
  });
}
