import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { archiveStudent, StudentServiceError, updateStudent } from "@/lib/classroom/student-service";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

async function getActor(request: Request) {
  if (!authConfigured) return { response: NextResponse.json({ error: "Authentication is not configured." }, { status: 503 }) };
  const session = await getUserSession();
  if (!session?.user) return { response: NextResponse.json({ error: "Bạn cần đăng nhập để quản lý học sinh." }, { status: 401, headers: noStoreHeaders() }) };
  if (!isSameOrigin(request)) return { response: NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() }) };
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  return { actorUserId: session.user.id };
}

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof StudentServiceError) {
    const status = error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : error.code === "STUDENT_NOT_IN_CLASS" || error.code === "NOT_FOUND" ? 404 : error.code === "DUPLICATE_CODE" || error.code === "SEAT_TAKEN" ? 409 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
  }
  console.error("[teacher/students] mutation failed", error instanceof Error ? { name: error.name, message: error.message } : error);
  return NextResponse.json({ error: fallback }, { status: 500, headers: noStoreHeaders() });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const actor = await getActor(request);
    if (actor.response) return actor.response;
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json({ error: "Dữ liệu học sinh không hợp lệ." }, { status: 400, headers: noStoreHeaders() });
    }
    const result = await updateStudent(payload, (await params).studentId, actor.actorUserId!);
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error, "Không thể cập nhật học sinh lúc này.");
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const actor = await getActor(request);
    if (actor.response) return actor.response;
    const classId = new URL(request.url).searchParams.get("classId");
    const result = await archiveStudent({ classId }, (await params).studentId, actor.actorUserId!);
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    return errorResponse(error, "Không thể lưu trữ học sinh lúc này.");
  }
}
