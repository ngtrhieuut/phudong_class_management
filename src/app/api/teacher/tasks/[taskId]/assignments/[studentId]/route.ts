import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";
import { approveTaskAssignment, TaskServiceError } from "@/lib/classroom/task-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ taskId: string; studentId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  try {
    const { taskId, studentId } = await params;
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await approveTaskAssignment(taskId, studentId, session.user.id);
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof TaskServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : error.code === "INVALID_STATUS" ? 409 : 422, headers: noStoreHeaders() });
    return NextResponse.json({ error: "Không thể duyệt nhiệm vụ." }, { status: 500, headers: noStoreHeaders() });
  }
}
