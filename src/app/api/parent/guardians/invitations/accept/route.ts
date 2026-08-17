import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { acceptGuardianInvitation, GuardianInvitationError } from "@/lib/guardian/invitation-service";
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
    return NextResponse.json({ error: "Bạn cần đăng nhập trước khi nhận lời mời." }, { status: 401, headers: noStoreHeaders() });
  }

  try {
    const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const result = await acceptGuardianInvitation(await request.json(), {
      userId: appUser.id,
      email: appUser.email,
      displayName: appUser.displayName,
    });
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof GuardianInvitationError) {
      const status = error.code === "INVITATION_NOT_VALID" ? 422 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể nhận lời mời phụ huynh." }, { status: 500, headers: noStoreHeaders() });
  }
}
