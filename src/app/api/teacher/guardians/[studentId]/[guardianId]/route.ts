import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";
import { GuardianServiceError, revokeGuardian } from "@/lib/guardian/service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ studentId: string; guardianId: string }> },
) {
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
    const { studentId, guardianId } = await params;
    const body = await request.json() as { classId?: unknown };
    if (typeof body.classId !== "string") {
      return NextResponse.json({ error: "Thiếu classId." }, { status: 422, headers: noStoreHeaders() });
    }
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await revokeGuardian({ classId: body.classId, studentId, guardianId }, session.user.id);
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof GuardianServiceError) {
      const status = error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : error.code === "RELATION_NOT_FOUND" ? 404 : 422;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể thu hồi liên kết phụ huynh." }, { status: 500, headers: noStoreHeaders() });
  }
}
