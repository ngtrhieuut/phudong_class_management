import { NextResponse } from "next/server";

import { authConfigured, getUserSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/app-user";
import { recordBehaviorScoreBatch, ScoreRecordingError } from "@/lib/classroom/score-service";

export const dynamic = "force-dynamic";

function assertSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL)
      : null;
    return originUrl.origin === requestUrl.origin || originUrl.origin === configuredUrl?.origin;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để thực hiện thao tác này." }, { status: 401 });
  }
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) {
    return NextResponse.json({ error: "Thiếu idempotency key." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  try {
    await ensureAppUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });
    const result = await recordBehaviorScoreBatch(payload, session.user.id, idempotencyKey);
    return NextResponse.json({ data: result }, { status: 201, headers: { "Cache-Control": "no-store" } });
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
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "Không thể lưu ghi nhận lúc này." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
