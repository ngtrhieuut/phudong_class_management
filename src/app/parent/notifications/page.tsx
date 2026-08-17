import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell } from "@/components/parent/parent-shell";
import { ParentNotificationList } from "@/components/parent/parent-notification-list";

export const dynamic = "force-dynamic";

export default async function ParentNotificationsPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { children, studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);
  if (!studentId || !data) return <ParentShell active="" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none" childrenOptions={children}><ParentEmptyState /></ParentShell>;

  return (
    <ParentShell active="" childName={data.child.fullName} className={data.child.className} studentId={studentId} childrenOptions={children}>
      <div className="mb-6"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Cập nhật an toàn</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Thông báo</h1><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Các cập nhật liên quan đến con và hoạt động trong lớp.</p></div>
      <ParentNotificationList initialNotifications={data.notifications} />
    </ParentShell>
  );
}
