import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { deletePraiseMedia, getAccessiblePraiseMedia, PraiseMediaError } from "@/lib/media/praise-media";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

async function getAuthenticatedUser() {
  if (!authConfigured) return null;
  const session = await getUserSession();
  if (!session?.user) return null;
  return ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  const { mediaId } = await params;
  const media = await getAccessiblePraiseMedia(mediaId, user.id);
  if (!media) return NextResponse.json({ error: "Không tìm thấy media." }, { status: 404, headers: noStoreHeaders() });

  try {
    const blob = await get(media.storageKey, { access: "private" });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "Không tìm thấy file." }, { status: 404, headers: noStoreHeaders() });
    const headers = new Headers(noStoreHeaders());
    headers.set("Content-Type", media.mimeType || blob.blob.contentType);
    headers.set("Content-Disposition", "inline");
    headers.set("ETag", blob.blob.etag);
    return new Response(blob.stream, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "Không thể đọc media từ storage." }, { status: 503, headers: noStoreHeaders() });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  try {
    const result = await deletePraiseMedia((await params).mediaId, user.id);
    return NextResponse.json({ data: result }, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof PraiseMediaError) {
      const status = error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "STORAGE_NOT_CONFIGURED" ? 503 : 422;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể xóa media." }, { status: 500, headers: noStoreHeaders() });
  }
}
