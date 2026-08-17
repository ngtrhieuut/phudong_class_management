import { AppShell } from "@/components/layout/app-shell";
import { TeacherTaskManager } from "@/components/dashboard/teacher-task-manager";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getClassStudents, getTeacherClasses } from "@/lib/classroom/queries";
import { getTeacherTaskBoard } from "@/lib/classroom/task-queries";

export const dynamic = "force-dynamic";

export default async function TeacherTasksPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  const classId = (await searchParams).classId;
  const [board, classOptions] = await Promise.all([
    getTeacherTaskBoard(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);
  if (!board) return <AppShell active="Nhiệm vụ" classOptions={classOptions} selectedClassId={classId} classSwitcherPath="/teacher/tasks" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl}><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-heading text-3xl font-bold text-[var(--primary)]">Chưa có lớp được phân công</h1></div></AppShell>;
  const students = await getClassStudents(session.user.id, board.classContext.id);
  return <AppShell active="Nhiệm vụ" classOptions={classOptions} selectedClassId={board.classContext.id} classSwitcherPath="/teacher/tasks" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl} className={board.classContext.name} schoolYearName={board.classContext.schoolYearName}><div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10"><div className="mb-8"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Học cùng nhau</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Nhiệm vụ</h1><p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Tạo nhiệm vụ rõ ràng, duyệt hoàn thành và ghi nhận sao minh bạch.</p></div><TeacherTaskManager classId={board.classContext.id} students={students.map((student) => ({ id: student.id, name: student.fullName }))} tasks={board.tasks} assignments={board.assignments} /></div></AppShell>;
}
