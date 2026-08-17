import Link from "next/link";
import { ArrowRight, CheckCircle, Gift, Medal, Star, TrendUp } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell, initials } from "@/components/parent/parent-shell";

export const dynamic = "force-dynamic";

function levelFor(score: number, levels: readonly { name: string; minScore: number; maxScore: number | null; sortOrder: number }[]) {
  const ordered = [...levels].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = ordered.find((level) => score >= level.minScore && (level.maxScore === null || score <= level.maxScore));
  const next = ordered.find((level) => level.minScore > score);
  if (!current) return { name: "Chưa thiết lập", number: "—", progress: 0, nextScore: null };
  const progress = next ? Math.max(0, Math.min(100, Math.round(((score - current.minScore) / Math.max(1, next.minScore - current.minScore)) * 100))) : 100;
  return { name: current.name, number: String(current.sortOrder), progress, nextScore: next?.minScore ?? null };
}

export default async function ParentTodayPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { children, studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);

  if (!studentId || !data) return <ParentShell active="Hôm nay" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none" childrenOptions={children}><ParentEmptyState /></ParentShell>;
  const score = Number(data.child.lifetimeScore ?? 0);
  const spendable = Number(data.child.spendableStars ?? 0);
  const level = levelFor(score, data.levels);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayPositive = data.scores.filter((item) => new Date(item.occurredAt).getTime() >= todayStart.getTime()).reduce((total, item) => total + Math.max(0, Number(item.spendableDelta)), 0);

  return (
    <ParentShell active="Hôm nay" childName={data.child.fullName} className={data.child.className} studentId={studentId} childrenOptions={children}>
      <section className="relative overflow-hidden rounded-[2rem] bg-[var(--surface-lowest)] p-6 text-center soft-shadow sm:p-8">
        <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[var(--primary-fixed)]/60" />
        <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[var(--primary-fixed)] font-heading text-4xl font-bold text-[var(--primary)]">{initials(data.child.fullName)}</div>
        <h1 className="relative mt-5 font-heading text-3xl font-bold text-[var(--primary)]">Chào mừng {data.child.shortName || data.child.fullName}!</h1>
        <span className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--tertiary-container)]/20 px-3 py-1 font-heading text-xs font-bold text-[var(--tertiary)]"><Medal size={15} weight="fill" /> {level.name}</span>
        <p className="relative mt-3 font-body text-sm text-[var(--on-surface-variant)]">Cấp độ hiện tại: <strong>Level {level.number}</strong></p>
        <div className="relative mx-auto mt-5 max-w-lg rounded-2xl bg-[var(--surface-low)] p-4 text-left">
          <div className="flex justify-between font-heading text-xs font-bold text-[var(--primary)]"><span>Tiến độ cấp độ tiếp theo</span><span>{level.progress}%</span></div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--primary-fixed)]"><div className="h-full rounded-full bg-[var(--positive)]" style={{ width: `${level.progress}%` }} /></div>
          <p className="mt-2 text-right font-body text-xs text-[var(--on-surface-variant)]">{level.nextScore === null ? "Con đã ở cấp độ cao nhất hiện có." : `Còn ${Math.max(0, level.nextScore - score)} điểm để lên cấp độ mới.`}</p>
        </div>
      </section>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
        <section className="rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Star size={19} weight="fill" /></span><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Tổng kết hôm nay</h2></div><p className="mt-6 font-heading text-2xl font-bold leading-tight text-[var(--primary)]">Con đã nhận <span className="text-4xl text-[var(--secondary-container)]">{todayPositive}</span> sao hôm nay.</p><p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Mỗi ghi nhận nhỏ đều giúp con tiến bộ từng ngày.</p><Link href={`/parent/progress?studentId=${studentId}`} className="mt-6 inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--surface-low)] px-4 font-heading text-xs font-bold text-[var(--primary)]">Xem tiến bộ <ArrowRight size={16} /></Link></section>
        <section className="rounded-[2rem] bg-[var(--primary)] p-6 text-white shadow-lg shadow-blue-900/10"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15"><Gift size={19} weight="fill" /></span><h2 className="font-heading text-xl font-bold">Số sao có thể đổi</h2></div><p className="mt-6 font-heading text-5xl font-bold">{spendable}</p><p className="mt-2 font-body text-sm text-white/75">Sao dùng để đổi phần thưởng trong lớp.</p><Link href={`/parent/tasks?studentId=${studentId}`} className="mt-6 inline-flex min-h-11 items-center gap-1 rounded-full bg-white px-4 font-heading text-xs font-bold text-[var(--primary)]">Xem nhiệm vụ <ArrowRight size={16} /></Link></section>
      </div>
      <section className="mt-6 rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-heading text-2xl font-bold text-[var(--on-surface)]"><TrendUp size={22} className="text-[var(--primary)]" /> Hoạt động gần đây</h2><Link href={`/parent/progress?studentId=${studentId}`} className="font-heading text-xs font-bold text-[var(--primary)]">Xem tất cả</Link></div><div className="mt-5 space-y-3">{data.scores.slice(0, 4).map((item) => <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[var(--surface-low)] p-4"><span className={`flex h-10 w-10 items-center justify-center rounded-full ${Number(item.spendableDelta) >= 0 ? "bg-[var(--positive-soft)] text-[var(--positive)]" : "bg-[var(--needs-improvement-soft)] text-[var(--needs-improvement)]"}`}><Star size={18} weight="fill" /></span><div className="min-w-0 flex-1"><p className="font-body text-sm text-[var(--on-surface)]">{item.reason}</p><p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{new Date(item.occurredAt).toLocaleDateString("vi-VN")}</p></div><span className="font-heading text-sm font-bold text-[var(--primary)]">{Number(item.spendableDelta) > 0 ? "+" : ""}{item.spendableDelta}</span></div>)}{data.scores.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa có hoạt động nào được ghi nhận.</p> : null}</div></section>
      <section className="mt-6 grid gap-4 sm:grid-cols-2"><Link href={`/parent/tasks?studentId=${studentId}`} className="flex min-h-20 items-center gap-4 rounded-2xl bg-[var(--surface-lowest)] p-4 soft-shadow"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--primary)]"><CheckCircle size={23} weight="fill" /></span><span className="flex-1"><span className="block font-heading text-sm font-bold text-[var(--on-surface)]">Nhiệm vụ của con</span><span className="mt-1 block font-body text-xs text-[var(--on-surface-variant)]">{data.tasks.filter((task) => task.taskStatus !== "completed").length} nhiệm vụ đang theo dõi</span></span><ArrowRight size={18} className="text-[var(--outline)]" /></Link><Link href={`/parent/badges?studentId=${studentId}`} className="flex min-h-20 items-center gap-4 rounded-2xl bg-[var(--surface-lowest)] p-4 soft-shadow"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Medal size={23} weight="fill" /></span><span className="flex-1"><span className="block font-heading text-sm font-bold text-[var(--on-surface)]">Bộ sưu tập huy hiệu</span><span className="mt-1 block font-body text-xs text-[var(--on-surface-variant)]">{data.badges.length} huy hiệu đã đạt</span></span><ArrowRight size={18} className="text-[var(--outline)]" /></Link></section>
    </ParentShell>
  );
}
