import { Medal, Star } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell } from "@/components/parent/parent-shell";

export const dynamic = "force-dynamic";

export default async function ParentBadgesPage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);
  if (!studentId || !data) return <ParentShell active="Huy hiệu" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none"><ParentEmptyState /></ParentShell>;
  return <ParentShell active="Huy hiệu" childName={data.child.fullName} className={data.child.className} studentId={studentId}><div className="mb-6"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Cột mốc đáng nhớ</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Huy hiệu</h1></div><div className="grid gap-4 sm:grid-cols-2">{data.badges.map((badge) => <article key={badge.id} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 text-center soft-shadow"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--secondary-container)] text-[var(--secondary)]"><Medal size={32} weight="fill" /></span><h2 className="mt-4 font-heading text-lg font-bold text-[var(--on-surface)]">{badge.name}</h2><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{badge.description}</p><p className="mt-3 font-body text-xs text-[var(--on-surface-variant)]">Đạt ngày {new Date(badge.awardedAt).toLocaleDateString("vi-VN")}</p></article>)}{data.badges.length === 0 ? <div className="sm:col-span-2"><ParentEmptyState message="Con chưa có huy hiệu nào. Mỗi nỗ lực nhỏ đều được nhìn thấy." /></div> : null}</div><section className="mt-6 rounded-[1.5rem] bg-[var(--surface-low)] p-5"><h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--primary)]"><Star size={20} weight="fill" /> Các cấp độ của lớp</h2><div className="mt-4 grid gap-2 sm:grid-cols-2">{data.levels.map((level) => <div key={level.id} className="rounded-2xl bg-[var(--surface-lowest)] p-4"><p className="font-heading text-sm font-bold text-[var(--on-surface)]">Level {level.sortOrder} · {level.name}</p><p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">Từ {level.minScore} điểm{level.maxScore === null ? " trở lên" : ` đến ${level.maxScore} điểm`}</p></div>)}</div></section></ParentShell>;
}
