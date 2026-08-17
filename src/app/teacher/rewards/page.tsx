import { AppShell } from "@/components/layout/app-shell";
import { TeacherRewardManager } from "@/components/dashboard/teacher-reward-manager";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getClassStudents, getTeacherClasses } from "@/lib/classroom/queries";
import { getTeacherRewardBoard } from "@/lib/classroom/task-queries";

export const dynamic = "force-dynamic";

export default async function TeacherRewardsPage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  const classId = (await searchParams).classId;
  const [board, classOptions] = await Promise.all([
    getTeacherRewardBoard(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);
  if (!board) return <AppShell active="Kho quà" classOptions={classOptions} selectedClassId={classId} classSwitcherPath="/teacher/rewards" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl}><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-heading text-3xl font-bold text-[var(--primary)]">Chưa có lớp được phân công</h1></div></AppShell>;
  const students = await getClassStudents(session.user.id, board.classContext.id);
  return <AppShell active="Kho quà" classOptions={classOptions} selectedClassId={board.classContext.id} classSwitcherPath="/teacher/rewards" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl} className={board.classContext.name} schoolYearName={board.classContext.schoolYearName}><div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10"><TeacherRewardManager classId={board.classContext.id} students={students.map((student) => ({ id: student.id, name: student.fullName }))} rewards={board.rewards} initialRedemptions={board.redemptions} /></div></AppShell>;
}
