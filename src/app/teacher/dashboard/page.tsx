import { AppShell } from "@/components/layout/app-shell";
import { DashboardScreen } from "@/components/dashboard/dashboard-screen";
import { auth } from "@/lib/auth/server";
import { dashboardStudents, demoClass, recentActivities, recentPraise, behaviorPresets } from "@/lib/demo-data";

export const dynamic = "force-dynamic";

export default async function TeacherDashboardPage() {
  const { data: session } = await auth.getSession();
  const teacherName = session?.user?.name || "Cô Mai";

  return (
    <AppShell active="Trang chủ">
      <DashboardScreen
        teacherName={teacherName}
        className={demoClass.name}
        students={dashboardStudents}
        activities={recentActivities}
        praiseItems={recentPraise}
        behaviors={behaviorPresets}
      />
    </AppShell>
  );
}
