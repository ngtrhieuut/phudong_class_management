import { Sparkle } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell } from "@/components/parent/parent-shell";

export const dynamic = "force-dynamic";

export default async function ParentPraisePage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);
  if (!studentId || !data) return <ParentShell active="Tuyên dương" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none"><ParentEmptyState /></ParentShell>;
  return <ParentShell active="Tuyên dương" childName={data.child.fullName} className={data.child.className} studentId={studentId}><div className="mb-6"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Lan tỏa điều tốt</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Góc tuyên dương</h1></div><div className="space-y-4">{data.praise.map((post) => <article key={post.id} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><div className="flex items-start gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--secondary-container)] text-[var(--secondary)]"><Sparkle size={24} weight="fill" /></span><div><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">{post.title}</h2><p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{post.studentNames} · {new Date(post.createdAt).toLocaleDateString("vi-VN")}</p></div></div><p className="mt-5 font-body text-sm leading-7 text-[var(--on-surface-variant)]">{post.body}</p></article>)}{data.praise.length === 0 ? <ParentEmptyState message="Chưa có bài tuyên dương nào dành cho con." /> : null}</div></ParentShell>;
}
