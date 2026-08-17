import { Bell, CheckCircle } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell } from "@/components/parent/parent-shell";

export const dynamic = "force-dynamic";

export default async function ParentNotificationsPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);
  if (!studentId || !data) return <ParentShell active="" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none"><ParentEmptyState /></ParentShell>;

  return (
    <ParentShell active="" childName={data.child.fullName} className={data.child.className} studentId={studentId}>
      <div className="mb-6"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Cập nhật an toàn</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Thông báo</h1><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Các cập nhật liên quan đến con và hoạt động trong lớp.</p></div>
      <div className="space-y-3">
        {data.notifications.map((notification) => (
          <article key={notification.id} className={`rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow ${notification.readAt ? "" : "ring-2 ring-[var(--primary-fixed)]"}`}>
            <div className="flex items-start gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-[var(--primary)]">{notification.readAt ? <CheckCircle size={22} weight="fill" /> : <Bell size={22} weight="fill" />}</span><div className="min-w-0 flex-1"><h2 className="font-heading text-base font-bold text-[var(--on-surface)]">{notification.title}</h2><p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{notification.body}</p><time className="mt-3 block font-body text-xs text-[var(--outline)]">{new Date(notification.createdAt).toLocaleString("vi-VN")}</time></div></div>
          </article>
        ))}
        {data.notifications.length === 0 ? <ParentEmptyState message="Chưa có thông báo mới." /> : null}
      </div>
    </ParentShell>
  );
}
