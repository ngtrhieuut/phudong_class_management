import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";
import { redeemReward, RewardServiceError } from "@/lib/classroom/reward-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  const idempotencyKey = request.headers.get("idempotency-key")?.trim();
  if (!idempotencyKey) return NextResponse.json({ error: "Thiếu idempotency key." }, { status: 400, headers: noStoreHeaders() });
  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await redeemReward(await request.json(), session.user.id, idempotencyKey);
    return NextResponse.json({ data: result }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof RewardServiceError) return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : 409, headers: noStoreHeaders() });
    return NextResponse.json({ error: "Không thể đổi phần thưởng." }, { status: 500, headers: noStoreHeaders() });
  }
}
