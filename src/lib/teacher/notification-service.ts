import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { classMemberships, notifications, users } from "@/db/schema";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const teacherNotificationRecipientRoles = ["homeroom_teacher", "teacher", "assistant"] as const;
const notificationIdSchema = z.string().uuid();

export type TeacherNotificationKind = "task_created" | "reward_redemption_requested";

export type TeacherNotificationContent = {
  type: TeacherNotificationKind;
  title: string;
  body: string;
  deepLink: string;
};

export function getTeacherNotificationContent(
  kind: TeacherNotificationKind,
  classId: string,
): TeacherNotificationContent {
  const classQuery = `classId=${encodeURIComponent(classId)}`;

  if (kind === "task_created") {
    return {
      type: kind,
      title: "Nhiệm vụ mới trong lớp",
      body: "Một nhiệm vụ mới đã được tạo trong lớp bạn phụ trách.",
      deepLink: `/teacher/tasks?${classQuery}`,
    };
  }

  return {
    type: kind,
    title: "Có yêu cầu đổi quà mới",
    body: "Một yêu cầu đổi phần thưởng đang chờ giáo viên xử lý.",
    deepLink: `/teacher/rewards?${classQuery}`,
  };
}

export async function notifyClassStaff(
  tx: Transaction,
  classId: string,
  kind: TeacherNotificationKind,
) {
  const staffRows = await tx
    .select({ userId: classMemberships.userId })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .where(
      and(
        eq(classMemberships.classId, classId),
        inArray(classMemberships.role, teacherNotificationRecipientRoles),
        eq(users.status, "active"),
      ),
    );
  const userIds = [...new Set(staffRows.map((row) => row.userId))];
  if (userIds.length === 0) return 0;

  const content = getTeacherNotificationContent(kind, classId);
  await tx.insert(notifications).values(userIds.map((userId) => ({ userId, ...content })));
  return userIds.length;
}

export class TeacherNotificationError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "TeacherNotificationError";
  }
}

export async function markTeacherNotificationRead(notificationId: string, userId: string) {
  if (!notificationIdSchema.safeParse(notificationId).success) {
    throw new TeacherNotificationError("INVALID_INPUT", "Thông báo không hợp lệ.");
  }

  const [notification] = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });

  if (!notification) {
    const [ownedNotification] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .limit(1);
    if (!ownedNotification) throw new TeacherNotificationError("NOT_FOUND", "Không tìm thấy thông báo.");
  }

  return { notificationId, read: true };
}

export async function markAllTeacherNotificationsRead(userId: string) {
  const result = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });

  return { count: result.length, read: true };
}
