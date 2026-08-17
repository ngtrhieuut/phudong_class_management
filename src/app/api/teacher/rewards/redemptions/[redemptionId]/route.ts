import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";
import { RewardServiceError, transitionRewardRedemption } from "@/lib/classroom/reward-service";

export const dynamic = "force-dynamic";

function statusForRewardError(error: RewardServiceError) {
  if (error.code === "FORBIDDEN_CLASS_ACCESS") return 403;
  if (error.code === "NOT_FOUND") return 404;
  if (error.code === "INVALID_STATUS") return 409;
  return 400;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ redemptionId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });

  try {
    const { redemptionId } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400, headers: noStoreHeaders() });
    }
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await transitionRewardRedemption(redemptionId, body, session.user.id);
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof RewardServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusForRewardError(error), headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể cập nhật yêu cầu đổi quà." }, { status: 500, headers: noStoreHeaders() });
  }
}
