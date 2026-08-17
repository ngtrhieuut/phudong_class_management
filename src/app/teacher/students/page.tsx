import { AppShell } from "@/components/layout/app-shell";
import { StudentsScreen } from "@/components/dashboard/students-screen";
import { StudentCreateForm } from "@/components/dashboard/student-create-form";
import { requireUserSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/app-user";
import { toStudentPresentation } from "@/lib/classroom/presentation";
import { getClassConfiguration, getClassStudents, getTeacherClass, getTeacherClasses } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage({ searchParams }: { searchParams: Promise<{ classId?: string; q?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
  });
  const params = await searchParams;
  const classId = params.classId;
  const searchTerm = params.q?.trim();
  const [classContext, classOptions] = await Promise.all([
    getTeacherClass(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);
  const [students, configuration] = classContext
    ? await Promise.all([
        // Load the complete class once so clearing the local search can always
        // restore every student after a top-bar search navigation.
        getClassStudents(session.user.id, classContext.id),
        getClassConfiguration(session.user.id, classContext.id),
      ])
    : [[], null];
  const presentationStudents = students.map((student, index) =>
    toStudentPresentation(student, configuration?.levels ?? [], index),
  );

  return (
    <AppShell active="Học sinh" classOptions={classOptions} selectedClassId={classContext?.id ?? classId} classSwitcherPath="/teacher/students" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl} className={classContext?.name} schoolYearName={classContext?.schoolYearName}>
      {classContext ? <div className="mx-auto max-w-6xl px-5 pt-6 sm:px-8"><StudentCreateForm classId={classContext.id} /></div> : null}
      <StudentsScreen initialStudents={presentationStudents} initialQuery={searchTerm ?? ""} classId={classContext?.id} scoreClassId={classContext?.id} importHref={classContext ? `/teacher/students/import?classId=${classContext.id}` : "/teacher/students/import"} exportHref={classContext ? `/api/teacher/students/export?classId=${classContext.id}` : undefined} />
    </AppShell>
  );
}
