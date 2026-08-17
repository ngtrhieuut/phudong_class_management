import { AppShell } from "@/components/layout/app-shell";
import { TeacherNotificationCenter } from "@/components/dashboard/teacher-notification-center";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getTeacherClasses } from "@/lib/classroom/queries";
import { getTeacherNotifications } from "@/lib/teacher/notification-queries";

export const dynamic = "force-dynamic";

export default async function TeacherNotificationsPage() {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  const [notifications, classOptions] = await Promise.all([
    getTeacherNotifications(session.user.id),
    getTeacherClasses(session.user.id),
  ]);
  const selectedClass = classOptions[0];

  return (
    <AppShell
      active="Thông báo"
      classOptions={classOptions}
      selectedClassId={selectedClass?.id}
      classSwitcherPath="/teacher/notifications"
      teacherName={appUser.displayName}
      teacherAvatarUrl={appUser.avatarUrl}
      className={selectedClass?.name}
      schoolYearName={selectedClass?.schoolYearName}
    >
      <div className="mx-auto max-w-[1100px] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mb-8">
          <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Cập nhật trong lớp</p>
          <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Thông báo</h1>
          <p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Theo dõi các việc cần biết và quay lại nhanh các khu vực liên quan.</p>
        </div>
        <TeacherNotificationCenter initialNotifications={notifications} />
      </div>
    </AppShell>
  );
}
