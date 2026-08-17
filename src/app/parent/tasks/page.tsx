import { CheckCircle, Clock, Gift } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell } from "@/components/parent/parent-shell";

export const dynamic = "force-dynamic";

export default async function ParentTasksPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);
  if (!studentId || !data) return <ParentShell active="Nhiệm vụ" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none"><ParentEmptyState /></ParentShell>;
  return <ParentShell active="Nhiệm vụ" childName={data.child.fullName} className={data.child.className} studentId={studentId}><div className="mb-6"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Cùng con hoàn thành</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Nhiệm vụ</h1></div><div className="space-y-3">{data.tasks.map((task) => <article key={task.id} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow"><div className="flex items-start gap-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${task.taskStatus === "completed" ? "bg-[var(--positive-soft)] text-[var(--positive)]" : "bg-[var(--surface-container)] text-[var(--primary)]"}`}>{task.taskStatus === "completed" ? <CheckCircle size={22} weight="fill" /> : <Clock size={22} />}</span><div className="min-w-0 flex-1"><h2 className="font-heading text-lg font-bold text-[var(--on-surface)]">{task.title}</h2><p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{task.description}</p><p className="mt-3 font-body text-xs text-[var(--on-surface-variant)]">Hạn: {new Date(task.dueAt).toLocaleDateString("vi-VN")}</p></div><span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary-container)]/40 px-3 py-1 font-heading text-xs font-bold text-[var(--secondary)]"><Gift size={14} weight="fill" /> {task.rewardStars}</span></div></article>)}{data.tasks.length === 0 ? <ParentEmptyState message="Chưa có nhiệm vụ nào được giao cho con." /> : null}</div></ParentShell>;
}
