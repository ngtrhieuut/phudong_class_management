import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { createStudent, StudentServiceError } from "@/lib/classroom/student-service";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập để quản lý học sinh." }, { status: 401, headers: noStoreHeaders() });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu học sinh không hợp lệ." }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await createStudent(payload, session.user.id);
    return NextResponse.json({ data: result }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof StudentServiceError) {
      const status = error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : error.code === "DUPLICATE_CODE" || error.code === "SEAT_TAKEN" ? 409 : error.code === "STUDENT_NOT_IN_CLASS" || error.code === "NOT_FOUND" ? 404 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể tạo học sinh lúc này." }, { status: 500, headers: noStoreHeaders() });
  }
}
