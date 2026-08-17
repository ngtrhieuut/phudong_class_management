import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";

export const TEACHER_NOTIFICATION_LIMIT = 100;

export const teacherNotificationSelection = {
  id: notifications.id,
  type: notifications.type,
  title: notifications.title,
  body: notifications.body,
  deepLink: notifications.deepLink,
  readAt: notifications.readAt,
  createdAt: notifications.createdAt,
};

export type TeacherNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export async function getTeacherNotifications(userId: string) {
  return db
    .select(teacherNotificationSelection)
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(TEACHER_NOTIFICATION_LIMIT);
}
