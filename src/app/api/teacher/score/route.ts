import { NextResponse } from "next/server";

import { authConfigured, getUserSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/app-user";
import { recordBehaviorScoreBatch, ScoreRecordingError } from "@/lib/classroom/score-service";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để thực hiện thao tác này." }, { status: 401, headers: noStoreHeaders() });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Thiếu idempotency key." }, { status: 400, headers: noStoreHeaders() });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    await ensureAppUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    const result = await recordBehaviorScoreBatch(payload, session.user.id, idempotencyKey);
    return NextResponse.json({ data: result }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof ScoreRecordingError) {
      const status =
        error.code === "FORBIDDEN_CLASS_ACCESS"
          ? 403
          : error.code === "STUDENT_NOT_IN_CLASS" || error.code === "BEHAVIOR_NOT_AVAILABLE"
            ? 422
          : error.code === "INSUFFICIENT_BALANCE" || error.code === "DAILY_LIMIT_REACHED"
              ? 409
              : error.code === "IDEMPOTENCY_CONFLICT"
                ? 409
              : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
    }

    return NextResponse.json({ error: "Không thể lưu ghi nhận lúc này." }, { status: 500, headers: noStoreHeaders() });
  }
}
