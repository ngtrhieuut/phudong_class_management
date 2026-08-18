import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import {
  getWritablePraisePostAccess,
  parsePraiseMediaUploadPayload,
  persistPraiseMedia,
  PRAISE_MEDIA_CONTENT_TYPES,
  PRAISE_MEDIA_MAX_BYTES,
  PraiseMediaError,
  validatePraiseMediaPathname,
} from "@/lib/media/praise-media";
import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

export const dynamic = "force-dynamic";

const clientPayloadSchema = z.object({ classId: z.string().uuid(), postId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503, headers: noStoreHeaders() });
  }

  const { postId } = await params;
  const body = await request.json().catch(() => null) as HandleUploadBody | null;
  if (!body || (body.type !== "blob.generate-client-token" && body.type !== "blob.upload-completed")) {
    return NextResponse.json({ error: "Upload request không hợp lệ." }, { status: 422, headers: noStoreHeaders() });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403, headers: noStoreHeaders() });
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: "Private media storage chưa được cấu hình.", code: "STORAGE_NOT_CONFIGURED" }, { status: 503, headers: noStoreHeaders() });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers: noStoreHeaders() });
  }
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const actorUserId = appUser.id;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        if (!actorUserId) throw new PraiseMediaError("FORBIDDEN", "Upload session không hợp lệ.");
        let rawPayload: unknown = null;
        try {
          rawPayload = clientPayload ? JSON.parse(clientPayload) : null;
        } catch {
          throw new PraiseMediaError("INVALID_INPUT", "Thông tin upload không hợp lệ.");
        }
        const parsedPayload = clientPayloadSchema.safeParse(rawPayload);
        if (!parsedPayload.success || parsedPayload.data.postId !== postId) {
          throw new PraiseMediaError("INVALID_INPUT", "Bài tuyên dương không hợp lệ.");
        }
        const access = await getWritablePraisePostAccess(actorUserId, parsedPayload.data.postId, parsedPayload.data.classId);
        if (!access) throw new PraiseMediaError("FORBIDDEN", "Bạn không có quyền upload cho bài này.");
        validatePraiseMediaPathname(pathname);
        return {
          allowedContentTypes: [...PRAISE_MEDIA_CONTENT_TYPES],
          maximumSizeInBytes: PRAISE_MEDIA_MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            actorUserId,
            organizationId: access.organizationId,
            classId: parsedPayload.data.classId,
            postId: parsedPayload.data.postId,
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const parsedPayload = parsePraiseMediaUploadPayload(tokenPayload ?? null);
        if (parsedPayload.postId !== postId) throw new PraiseMediaError("INVALID_INPUT", "Bài tuyên dương không hợp lệ.");
        if (parsedPayload.actorUserId !== actorUserId) throw new PraiseMediaError("FORBIDDEN", "Upload session không hợp lệ.");
        await persistPraiseMedia({ blob, tokenPayload });
      },
    });
    return NextResponse.json(jsonResponse, { headers: noStoreHeaders() });
  } catch (error) {
    if (error instanceof PraiseMediaError) {
      const status = error.code === "FORBIDDEN" ? 403 : error.code === "NOT_FOUND" ? 404 : error.code === "STORAGE_NOT_CONFIGURED" ? 503 : 422;
      return NextResponse.json({ error: error.message, code: error.code }, { status, headers: noStoreHeaders() });
    }
    return NextResponse.json({ error: "Không thể upload media." }, { status: 500, headers: noStoreHeaders() });
  }
}
