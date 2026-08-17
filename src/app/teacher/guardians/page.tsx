import { AppShell } from "@/components/layout/app-shell";
import { TeacherGuardianManager } from "@/components/dashboard/teacher-guardian-manager";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getTeacherClasses } from "@/lib/classroom/queries";
import { getTeacherGuardianBoard } from "@/lib/guardian/queries";

export const dynamic = "force-dynamic";

export default async function TeacherGuardiansPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const classId = (await searchParams).classId;
  const [board, classOptions] = await Promise.all([
    getTeacherGuardianBoard(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);

  if (!board) {
    return (
      <AppShell active="Phụ huynh" classOptions={classOptions} selectedClassId={classId} classSwitcherPath="/teacher/guardians" teacherName={appUser.displayName}>
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold text-[var(--primary)]">Chưa có lớp được phân công</h1>
          <p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">Hãy liên hệ quản trị viên để được gắn lớp.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell active="Phụ huynh" classOptions={classOptions} selectedClassId={board.classContext.id} classSwitcherPath="/teacher/guardians" teacherName={appUser.displayName} className={board.classContext.name} schoolYearName={board.classContext.schoolYearName}>
      <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mb-8">
          <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Đồng hành cùng gia đình</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Liên kết phụ huynh</h1>
          <p className="mt-3 max-w-2xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Quản lý đúng người được xem tiến bộ, lời khen và thông báo của từng học sinh.</p>
        </div>
        <TeacherGuardianManager classId={board.classContext.id} students={board.students} initialRelations={board.relations} />
      </div>
    </AppShell>
  );
}
