import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { awardBadge, BadgeServiceError } from "@/lib/classroom/badge-service";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

function statusForBadgeError(error: BadgeServiceError) {
  if (error.code === "FORBIDDEN_CLASS_ACCESS") return 403;
  if (error.code === "STUDENT_NOT_IN_CLASS") return 404;
  if (error.code === "ALREADY_AWARDED") return 409;
  return 400;
}

export async function POST(request: Request) {
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập để trao huy hiệu." }, { status: 401, headers: noStoreHeaders() });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu trao huy hiệu không hợp lệ." }, { status: 400, headers: noStoreHeaders() });
  }

  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await awardBadge(payload, session.user.id);
    return NextResponse.json({ data: result }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof BadgeServiceError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: statusForBadgeError(error), headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể trao huy hiệu lúc này." }, { status: 500, headers: noStoreHeaders() });
  }
}
