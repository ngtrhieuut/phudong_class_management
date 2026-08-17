import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { getClassStudents, getTeacherClass } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}
export async function GET(request: Request) {
  if (!authConfigured) return new Response("Authentication is not configured.", { status: 503 });
  const session = await getUserSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  const classId = new URL(request.url).searchParams.get("classId") || undefined;
  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
    const classContext = await getTeacherClass(session.user.id, classId);
    if (!classContext) return new Response("Forbidden", { status: 403 });
    const rows = await getClassStudents(session.user.id, classContext.id);
    const headers = ["Mã học sinh", "Họ và tên", "Ngày sinh", "Giới tính", "Số ghế", "Tổ", "Lifetime score", "Sao có thể đổi"];
    const lines = [headers, ...rows.map((row) => [row.studentCode, row.fullName, row.birthDate, row.gender, row.seatNo, row.groupName, row.lifetimeScore, row.spendableStars])].map((row) => row.map(csvCell).join(","));
    return new Response(`\uFEFF${lines.join("\r\n")}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="phudong-${classContext.id}-students.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Could not export students", { status: 500 });
  }
}
