import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { getTeacherClass } from "@/lib/classroom/queries";
import {
  StudentImportInputError,
  buildStudentImportPlan,
} from "@/lib/import/student-import";
import {
  persistStudentImportPlan,
  StudentImportPersistenceError,
} from "@/lib/import/student-import-persistence";

const importRequestSchema = z.object({
  context: z.object({
    organizationId: z.string().uuid(),
    schoolYearId: z.string().uuid(),
    classId: z.string().uuid(),
    className: z.string().trim().max(200).optional(),
  }),
  headers: z.array(z.string().max(200)).max(100).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).max(5000),
  confirm: z.boolean().default(false),
});

export const dynamic = "force-dynamic";

const MAX_IMPORT_BODY_BYTES = 5 * 1024 * 1024;

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

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return jsonResponse({ error: "Bạn cần đăng nhập để nhập danh sách." }, 401);
  }
  if (!assertSameOrigin(request)) return jsonResponse({ error: "Yêu cầu không hợp lệ." }, 403);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_IMPORT_BODY_BYTES) return jsonResponse({ error: "File import vượt quá 5 MB." }, 413);

  let rawBody: unknown = null;
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > MAX_IMPORT_BODY_BYTES) {
      return jsonResponse({ error: "File import vượt quá 5 MB." }, 413);
    }
    rawBody = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Dữ liệu import không hợp lệ." }, 400);
  }
  const requestPayload = importRequestSchema.safeParse(rawBody);
  if (!requestPayload.success) {
    return jsonResponse({ error: "Dữ liệu import không hợp lệ." }, 400);
  }
  if (
    requestPayload.data.rows.some(
      (row) => Object.keys(row).length > 100 || Object.values(row).some((value) => typeof value === "string" && value.length > 5000),
    )
  ) {
    return jsonResponse({ error: "File có quá nhiều cột hoặc một ô vượt quá giới hạn." }, 413);
  }

  try {
    await ensureAppUser({
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    });

    const { context, rows, headers, confirm } = requestPayload.data;
    const teacherClass = await getTeacherClass(session.user.id, context.classId);
    if (!teacherClass || teacherClass.organizationId !== context.organizationId || teacherClass.schoolYearId !== context.schoolYearId) {
      return jsonResponse({ error: "Bạn không có quyền nhập cho lớp này." }, 403);
    }

    const plan = buildStudentImportPlan({ context, rows, headers });
    if (!confirm) {
      return jsonResponse({
        data: {
          mode: "dry-run",
          counts: plan.counts,
          summary: plan.summary,
          errors: plan.errors,
          rows: plan.normalizedRows,
        },
      });
    }

    const result = await persistStudentImportPlan(plan, session.user.id);
    return jsonResponse({ data: { mode: "committed", result, summary: plan.summary } }, 201);
  } catch (error) {
    if (error instanceof StudentImportInputError) {
      return jsonResponse({ error: error.message }, 400);
    }
    if (error instanceof StudentImportPersistenceError) {
      return jsonResponse(
        { error: error.message, code: error.code, rowNumber: error.rowNumber },
        error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : 422,
      );
    }

    return jsonResponse({ error: "Không thể xử lý import lúc này." }, 500);
  }
}
