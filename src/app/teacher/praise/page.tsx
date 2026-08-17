import { AppShell } from "@/components/layout/app-shell";
import { TeacherPraisePanel } from "@/components/dashboard/teacher-praise-panel";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getClassStudents, getTeacherClass, getTeacherClasses } from "@/lib/classroom/queries";
import { getTeacherPraiseFeed } from "@/lib/praise/queries";

export const dynamic = "force-dynamic";

export default async function TeacherPraisePage({ searchParams }: { searchParams: Promise<{ classId?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  const classId = (await searchParams).classId;
  const [classContext, classOptions] = await Promise.all([
    getTeacherClass(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);
  if (!classContext) {
    return <AppShell active="Góc tuyên dương" classOptions={classOptions} selectedClassId={classId} classSwitcherPath="/teacher/praise" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl}><div className="mx-auto max-w-3xl px-5 py-16 text-center"><h1 className="font-heading text-3xl font-bold text-[var(--primary)]">Chưa có lớp được phân công</h1><p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">Hãy liên hệ quản trị viên để được gắn lớp.</p></div></AppShell>;
  }
  const [students, feed] = await Promise.all([
    getClassStudents(session.user.id, classContext.id),
    getTeacherPraiseFeed(session.user.id, classContext.id),
  ]);
  return <AppShell active="Góc tuyên dương" classOptions={classOptions} selectedClassId={classContext.id} classSwitcherPath="/teacher/praise" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl} className={classContext.name} schoolYearName={classContext.schoolYearName}><div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10"><div className="mb-8"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Lan tỏa điều tốt</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Góc tuyên dương</h1><p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Ghi lại những tiến bộ đáng nhớ để học sinh và phụ huynh cùng nhìn thấy.</p></div><TeacherPraisePanel classId={classContext.id} students={students.map((student) => ({ id: student.id, name: student.fullName, group: student.groupName || "Chưa phân tổ" }))} initialPosts={feed?.posts ?? []} /></div></AppShell>;
}
