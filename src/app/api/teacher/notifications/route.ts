import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";
import {
  markAllTeacherNotificationsRead,
  markTeacherNotificationRead,
  TeacherNotificationError,
} from "@/lib/teacher/notification-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  }

  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const body = await request.json() as { notificationId?: unknown; all?: unknown };
    const result = body.all === true
      ? await markAllTeacherNotificationsRead(session.user.id)
      : typeof body.notificationId === "string"
        ? await markTeacherNotificationRead(body.notificationId, session.user.id)
        : null;

    if (!result) {
      return NextResponse.json({ error: "Thiếu notificationId hoặc all." }, { status: 422, headers: noStoreHeaders() });
    }
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof TeacherNotificationError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.code === "NOT_FOUND" ? 404 : 422, headers: noStoreHeaders() },
      );
    }
    return NextResponse.json({ error: "Không thể cập nhật thông báo." }, { status: 500, headers: noStoreHeaders() });
  }
}
