import { AppShell } from "@/components/layout/app-shell";
import { StudentsScreen } from "@/components/dashboard/students-screen";
import { requireUserSession } from "@/lib/auth/server";
import { dashboardStudents } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function TeacherStudentsPage() {
  await requireUserSession();

  return (
    <AppShell active="Học sinh">
      <StudentsScreen initialStudents={dashboardStudents} />
    </AppShell>
  );
}
