import { and, eq, isNull } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";

export class ParentNotificationError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "ParentNotificationError";
  }
}

export async function markParentNotificationRead(notificationId: string, userId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) {
    throw new ParentNotificationError("INVALID_INPUT", "Thông báo không hợp lệ.");
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
    if (!ownedNotification) throw new ParentNotificationError("NOT_FOUND", "Không tìm thấy thông báo.");
  }

  return { notificationId, read: true };
}

export async function markAllParentNotificationsRead(userId: string) {
  const result = await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    .returning({ id: notifications.id });
  return { count: result.length, read: true };
}
