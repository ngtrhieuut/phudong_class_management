import { del } from "@vercel/blob";
import { aliasedTable } from "drizzle-orm/alias";
import { and, eq, inArray, isNull, notExists, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classes,
  classMemberships,
  classStudents,
  guardians,
  mediaAssets,
  organizationMembers,
  praisePostStudents,
  praisePosts,
  studentGuardians,
  users,
} from "@/db/schema";

export const PRAISE_MEDIA_OWNER_TYPE = "praise_post";
export const PRAISE_MEDIA_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm"] as const;
export const PRAISE_MEDIA_MAX_BYTES = 50 * 1024 * 1024;

const teacherRoles = ["homeroom_teacher", "teacher"] as const;
const mediaWriteRoles = ["homeroom_teacher", "teacher"] as const;
const uploadPayloadSchema = z.object({
  actorUserId: z.string().uuid(),
  organizationId: z.string().uuid(),
  classId: z.string().uuid(),
  postId: z.string().uuid(),
});

export class PraiseMediaError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "STORAGE_NOT_CONFIGURED",
    message: string,
  ) {
    super(message);
    this.name = "PraiseMediaError";
  }
}

function isAllowedContentType(value: string) {
  return (PRAISE_MEDIA_CONTENT_TYPES as readonly string[]).includes(value);
}

export function parsePraiseMediaUploadPayload(value: string | null) {
  let input: unknown = null;
  try {
    input = value ? JSON.parse(value) : null;
  } catch {
    throw new PraiseMediaError("INVALID_INPUT", "Thông tin upload không hợp lệ.");
  }
  const parsed = uploadPayloadSchema.safeParse(input);
  if (!parsed.success) throw new PraiseMediaError("INVALID_INPUT", "Thông tin upload không hợp lệ.");
  return parsed.data;
}

export function validatePraiseMediaPathname(pathname: string) {
  const normalized = pathname.trim();
  if (
    normalized.length < 1 ||
    normalized.length > 180 ||
    normalized.startsWith("/") ||
    normalized.includes("\\") ||
    normalized.includes("..") ||
    /[\u0000-\u001f]/u.test(normalized)
  ) {
    throw new PraiseMediaError("INVALID_INPUT", "Tên file không hợp lệ.");
  }
  return normalized;
}

export function validatePraiseMediaContent(contentType: string, size: number) {
  if (!isAllowedContentType(contentType) || !Number.isFinite(size) || size <= 0 || size > PRAISE_MEDIA_MAX_BYTES) {
    throw new PraiseMediaError("INVALID_INPUT", "File phải là ảnh/video được hỗ trợ và không quá 50 MB.");
  }
}

export async function getWritablePraisePostAccess(userId: string, postId: string, classId: string) {
  const [access] = await db
    .select({ organizationId: classes.organizationId, classId: classes.id, postId: praisePosts.id })
    .from(praisePosts)
    .innerJoin(classes, eq(classes.id, praisePosts.classId))
    .innerJoin(classMemberships, eq(classMemberships.classId, classes.id))
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .where(
      and(
        eq(praisePosts.id, postId),
        eq(praisePosts.classId, classId),
        eq(classMemberships.userId, userId),
        inArray(classMemberships.role, teacherRoles),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return access ?? null;
}

export async function persistPraiseMedia(input: {
  blob: { url: string; contentType: string };
  tokenPayload: string | null | undefined;
}) {
  const payload = parsePraiseMediaUploadPayload(input.tokenPayload ?? null);
  if (!isAllowedContentType(input.blob.contentType)) {
    throw new PraiseMediaError("INVALID_INPUT", "Loại file upload không được hỗ trợ.");
  }

  const [post] = await db
    .select({ id: praisePosts.id, classId: praisePosts.classId, organizationId: classes.organizationId })
    .from(praisePosts)
    .innerJoin(classes, eq(classes.id, praisePosts.classId))
    .where(and(eq(praisePosts.id, payload.postId), eq(praisePosts.classId, payload.classId), eq(classes.organizationId, payload.organizationId)))
    .limit(1);
  if (!post) throw new PraiseMediaError("NOT_FOUND", "Không tìm thấy bài tuyên dương.");

  const [asset] = await db
    .insert(mediaAssets)
    .values({
      ownerType: PRAISE_MEDIA_OWNER_TYPE,
      ownerId: payload.postId,
      storageKey: input.blob.url,
      mimeType: input.blob.contentType,
    })
    .onConflictDoNothing({ target: mediaAssets.storageKey })
    .returning({ id: mediaAssets.id, mimeType: mediaAssets.mimeType });

  if (asset) {
    await db.insert(auditLogs).values({
      organizationId: post.organizationId,
      actorUserId: payload.actorUserId,
      entityType: "media_asset",
      entityId: asset.id,
      action: "created",
      afterJson: { ownerType: PRAISE_MEDIA_OWNER_TYPE, ownerId: payload.postId, mimeType: asset.mimeType },
    });
  }
  return asset ?? null;
}

async function getMediaTarget(mediaId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(mediaId)) return null;
  const [target] = await db
    .select({
      id: mediaAssets.id,
      storageKey: mediaAssets.storageKey,
      mimeType: mediaAssets.mimeType,
      postId: praisePosts.id,
      classId: praisePosts.classId,
      visibility: praisePosts.visibility,
      organizationId: classes.organizationId,
    })
    .from(mediaAssets)
    .innerJoin(praisePosts, and(eq(mediaAssets.ownerType, PRAISE_MEDIA_OWNER_TYPE), eq(mediaAssets.ownerId, praisePosts.id)))
    .innerJoin(classes, eq(classes.id, praisePosts.classId))
    .where(eq(mediaAssets.id, mediaId))
    .limit(1);
  return target ?? null;
}

async function canTeacherViewMedia(userId: string, classId: string) {
  const [access] = await db
    .select({ id: classMemberships.id })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .where(and(eq(classMemberships.userId, userId), eq(classMemberships.classId, classId), inArray(classMemberships.role, ["homeroom_teacher", "teacher", "assistant"]), eq(users.status, "active")))
    .limit(1);
  return Boolean(access);
}

async function canTeacherManageMedia(userId: string, classId: string) {
  const [access] = await db
    .select({ id: classMemberships.id })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .where(
      and(
        eq(classMemberships.userId, userId),
        eq(classMemberships.classId, classId),
        inArray(classMemberships.role, mediaWriteRoles),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return Boolean(access);
}

async function canAdminViewMedia(userId: string, organizationId: string) {
  const [access] = await db
    .select({ id: organizationMembers.id })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.role, "admin"), eq(users.status, "active")))
    .limit(1);
  return Boolean(access);
}

async function canGuardianViewMedia(userId: string, target: NonNullable<Awaited<ReturnType<typeof getMediaTarget>>>) {
  if (target.visibility === "teacher_only") return false;
  const otherPostStudents = aliasedTable(praisePostStudents, "other_guardian_praise_post_students");
  const [access] = await db
    .select({ id: studentGuardians.id })
    .from(praisePostStudents)
    .innerJoin(classStudents, and(eq(classStudents.studentId, praisePostStudents.studentId), eq(classStudents.classId, target.classId)))
    .innerJoin(studentGuardians, and(eq(studentGuardians.studentId, praisePostStudents.studentId), eq(studentGuardians.canView, true)))
    .innerJoin(guardians, and(eq(guardians.id, studentGuardians.guardianId), eq(guardians.userId, userId)))
    .where(
      and(
        eq(praisePostStudents.postId, target.postId),
        isNull(classStudents.leftAt),
        notExists(
          db
            .select({ id: otherPostStudents.id })
            .from(otherPostStudents)
            .where(
              and(
                eq(otherPostStudents.postId, target.postId),
                sql`${otherPostStudents.studentId} <> ${praisePostStudents.studentId}`,
              ),
            ),
        ),
      ),
    )
    .limit(1);
  return Boolean(access);
}

export async function getAccessiblePraiseMedia(mediaId: string, userId: string) {
  const target = await getMediaTarget(mediaId);
  if (!target) return null;
  if (await canTeacherViewMedia(userId, target.classId)) return target;
  if (await canAdminViewMedia(userId, target.organizationId)) return target;
  if (await canGuardianViewMedia(userId, target)) return target;
  return null;
}

export async function deletePraiseMedia(mediaId: string, userId: string) {
  const target = await getMediaTarget(mediaId);
  if (!target) throw new PraiseMediaError("NOT_FOUND", "Không tìm thấy media.");
  const canManage = (await canTeacherManageMedia(userId, target.classId)) || (await canAdminViewMedia(userId, target.organizationId));
  if (!canManage) throw new PraiseMediaError("FORBIDDEN", "Bạn không có quyền xóa media này.");

  try {
    await del(target.storageKey);
  } catch {
    throw new PraiseMediaError("STORAGE_NOT_CONFIGURED", "Không thể xóa file khỏi storage.");
  }

  await db.transaction(async (tx) => {
    await tx.delete(mediaAssets).where(eq(mediaAssets.id, mediaId));
    await tx.insert(auditLogs).values({
      organizationId: target.organizationId,
      actorUserId: userId,
      entityType: "media_asset",
      entityId: mediaId,
      action: "deleted",
      afterJson: { ownerType: PRAISE_MEDIA_OWNER_TYPE, ownerId: target.postId },
    });
  });
  return { id: mediaId, deleted: true };
}
