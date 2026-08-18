import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { noStoreHeaders, isSameOrigin } from "@/lib/http/request-security";
import { completeTeacherOnboarding, OnboardingError } from "@/lib/onboarding/service";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  const user = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  return NextResponse.json({ data: { userId: user.id } }, { headers: noStoreHeaders() });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  if (!authConfigured) return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  const session = await getUserSession();
  if (!session?.user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  try {
    const user = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
    const result = await completeTeacherOnboarding(await request.json(), user.id);
    return NextResponse.json({ data: result }, { status: 201, headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof OnboardingError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.code === "FORBIDDEN" ? 403 : error.code === "CONFLICT" ? 409 : 422, headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể khởi tạo lớp học lúc này." }, { status: 500, headers: noStoreHeaders() });
  }
}
