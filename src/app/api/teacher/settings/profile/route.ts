import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { users } from "@/db/schema";
import { ensureAppUser, getAppUserById } from "@/lib/auth/app-user";
import { auth, authConfigured, getUserSession } from "@/lib/auth/server";
import { isAvatarPresetUrl } from "@/lib/avatar-presets";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

const avatarUrlSchema = z
  .string()
  .trim()
  .max(200, "Avatar không hợp lệ.")
  .refine((value) => isAvatarPresetUrl(value), "Avatar phải là một mẫu icon nội bộ.")
  .nullable();

const profileInputSchema = z.object({
  displayName: z.string().trim().min(1, "Tên hiển thị không được để trống.").max(100, "Tên hiển thị quá dài."),
  avatarUrl: z
    .preprocess((value) => (typeof value === "string" && value.trim() === "" ? null : value), avatarUrlSchema)
    .optional()
    .default(null),
});

export async function PATCH(request: Request) {
  const headers = noStoreHeaders();

  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers });
  }

  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Thông tin hồ sơ không hợp lệ." }, { status: 400, headers });
  }

  const parsed = profileInputSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Thông tin hồ sơ không hợp lệ." },
      { status: 422, headers },
    );
  }

  const { displayName, avatarUrl } = parsed.data;

  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });

    const currentUser = await getAppUserById(session.user.id);
    if (!currentUser) return NextResponse.json({ error: "Không tìm thấy hồ sơ người dùng." }, { status: 404, headers });

    const [updatedUser] = await db
      .update(users)
      .set({ displayName, avatarUrl, updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
      .returning({ displayName: users.displayName, avatarUrl: users.avatarUrl });

    if (!updatedUser) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ người dùng." }, { status: 404, headers });
    }

    // Neon Auth and the application DB are separate systems. Persist locally
    // first, then compensate if Auth rejects the change so a failed request
    // cannot leave the two profiles silently diverged.
    const authResult = await auth.updateUser({ name: displayName, image: avatarUrl });
    if (authResult.error) {
      try {
        await db
          .update(users)
          .set({ displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl, updatedAt: new Date() })
          .where(eq(users.id, session.user.id));
      } catch {
        return NextResponse.json({ error: "Không thể đồng bộ hồ sơ. Vui lòng liên hệ quản trị viên." }, { status: 500, headers });
      }
      return NextResponse.json({ error: "Không thể cập nhật hồ sơ xác thực." }, { status: 422, headers });
    }

    return NextResponse.json({ data: updatedUser }, { headers });
  } catch {
    return NextResponse.json({ error: "Không thể cập nhật hồ sơ lúc này." }, { status: 500, headers });
  }
}
