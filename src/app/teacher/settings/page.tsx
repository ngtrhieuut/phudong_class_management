import { Gear, ShieldCheck } from "@phosphor-icons/react/dist/ssr";

import { AppShell } from "@/components/layout/app-shell";
import { TeacherSettingsForm } from "@/components/dashboard/teacher-settings-form";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getTeacherClasses } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

export default async function TeacherSettingsPage() {
  const session = await requireUserSession();
  const [appUser, classOptions] = await Promise.all([
    ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image }),
    getTeacherClasses(session.user.id),
  ]);
  const selectedClass = classOptions[0];

  return (
    <AppShell
      active="Cài đặt"
      classOptions={classOptions}
      selectedClassId={selectedClass?.id}
      classSwitcherPath="/teacher/settings"
      teacherName={appUser.displayName}
      teacherAvatarUrl={appUser.avatarUrl}
      className={selectedClass?.name}
      schoolYearName={selectedClass?.schoolYearName}
    >
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Tài khoản giáo viên</p>
            <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Cài đặt</h1>
            <p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Quản lý hồ sơ hiển thị và bảo mật tài khoản Phù Đổng của bạn.</p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-full bg-[var(--positive-soft)] px-4 py-2 font-body text-xs font-semibold text-[var(--positive)] sm:self-auto">
            <ShieldCheck size={17} weight="fill" /> Session được bảo vệ
          </div>
        </div>
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-[var(--surface-low)] px-4 py-3 font-body text-sm text-[var(--on-surface-variant)]">
          <Gear size={21} className="shrink-0 text-[var(--primary)]" />
          <span>Các thay đổi hồ sơ chỉ áp dụng cho tài khoản đang đăng nhập.</span>
        </div>
        <TeacherSettingsForm
          initialProfile={{
            displayName: appUser.displayName,
            email: appUser.email ?? session.user.email ?? "",
            avatarUrl: appUser.avatarUrl,
          }}
        />
      </div>
    </AppShell>
  );
}
