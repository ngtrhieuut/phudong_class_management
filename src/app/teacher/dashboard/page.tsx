import { AppShell } from "@/components/layout/app-shell";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { requireUserSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/app-user";
import { toDashboardPresentation } from "@/lib/classroom/presentation";
import { getTeacherClasses, getTeacherDashboardData } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage({ searchParams }: { searchParams: Promise<{ classId?: string; scoreStudent?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const params = await searchParams;
  const classId = params.classId;
  const [dashboard, classOptions] = await Promise.all([
    getTeacherDashboardData(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);

  return (
    <AppShell active="Trang chủ" classOptions={classOptions} selectedClassId={dashboard?.classContext.id ?? classId} teacherName={appUser.displayName} className={dashboard?.classContext.name} schoolYearName={dashboard?.classContext.schoolYearName}>
      {dashboard ? (
        <DashboardScreen
          teacherName={appUser.displayName}
          classId={dashboard.classContext.id}
          className={dashboard.classContext.name}
          initialScoreStudentId={params.scoreStudent}
          {...toDashboardPresentation(dashboard)}
        />
      ) : (
        <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8">
          <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Chưa có lớp được phân công</p>
          <h1 className="mt-3 font-heading text-4xl font-bold text-[var(--primary)]">Sẵn sàng đón lớp học của bạn</h1>
          <p className="mt-4 font-body leading-7 text-[var(--on-surface-variant)]">Tài khoản đã đăng nhập nhưng chưa được gắn với lớp nào. Hãy nhờ quản trị viên thêm quyền giáo viên cho lớp cần quản lý.</p>
        </div>
      )}
    </AppShell>
  );
}
