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
    organizationId: z.string().trim().min(1),
    schoolYearId: z.string().trim().min(1),
    classId: z.string().trim().min(1),
    className: z.string().trim().max(200).optional(),
  }),
  headers: z.array(z.string().max(200)).max(100).optional(),
  rows: z.array(z.record(z.string(), z.unknown())).max(5000),
  confirm: z.boolean().default(false),
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!authConfigured) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
  }

  const session = await getUserSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Bạn cần đăng nhập để nhập danh sách." }, { status: 401 });
  }

  const requestPayload = importRequestSchema.safeParse(await request.json().catch(() => null));
  if (!requestPayload.success) {
    return NextResponse.json({ error: "Dữ liệu import không hợp lệ." }, { status: 400 });
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
      return NextResponse.json({ error: "Bạn không có quyền nhập cho lớp này." }, { status: 403 });
    }

    const plan = buildStudentImportPlan({ context, rows, headers });
    if (!confirm) {
      return NextResponse.json({
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
    return NextResponse.json({ data: { mode: "committed", result, summary: plan.summary } }, { status: 201 });
  } catch (error) {
    if (error instanceof StudentImportInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof StudentImportPersistenceError) {
      return NextResponse.json(
        { error: error.message, code: error.code, rowNumber: error.rowNumber },
        { status: error.code === "FORBIDDEN_CLASS_ACCESS" ? 403 : 422 },
      );
    }

    return NextResponse.json({ error: "Không thể xử lý import lúc này." }, { status: 500 });
  }
}
