import { AppShell } from "@/components/layout/app-shell";
import { StudentsScreen } from "@/components/dashboard/students-screen";
import { requireUserSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/app-user";
import { toStudentPresentation } from "@/lib/classroom/presentation";
import { getClassConfiguration, getClassStudents, getTeacherClass } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  const session = await requireUserSession();
  await ensureAppUser({
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });
  const classContext = await getTeacherClass(session.user.id);
  const [students, configuration] = classContext
    ? await Promise.all([
        getClassStudents(session.user.id, classContext.id),
        getClassConfiguration(session.user.id, classContext.id),
      ])
    : [[], null];
  const presentationStudents = students.map((student, index) =>
    toStudentPresentation(student, configuration?.levels ?? [], index),
  );

  return (
    <AppShell active="Học sinh">
      <StudentsScreen initialStudents={presentationStudents} />
    </AppShell>
  );
}
