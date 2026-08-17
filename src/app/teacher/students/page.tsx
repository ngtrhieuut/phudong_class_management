import { AppShell } from "@/components/layout/app-shell";
import { StudentsScreen } from "@/components/dashboard/students-screen";
import { dashboardStudents } from "@/lib/demo-data";

export default function TeacherStudentsPage() {
  return (
    <AppShell active="Học sinh">
      <StudentsScreen initialStudents={dashboardStudents} />
    </AppShell>
  );
}
