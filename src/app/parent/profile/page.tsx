import { LinkBreak, ShieldCheck, UserCircle } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { resolveParentChild } from "@/lib/parent/page-data";
import { ParentEmptyState, ParentShell } from "@/components/parent/parent-shell";

export const dynamic = "force-dynamic";

export default async function ParentProfilePage({ searchParams }: { searchParams: Promise<{ studentId?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const { studentId, data } = await resolveParentChild(session.user.id, (await searchParams).studentId);
  if (!studentId || !data) return <ParentShell active="" childName="Phù Đổng" className="Cổng phụ huynh" studentId="none"><ParentEmptyState /></ParentShell>;
  return <ParentShell active="" childName={data.child.fullName} className={data.child.className} studentId={studentId}><div className="mb-6"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Thông tin an toàn</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Hồ sơ</h1></div><section className="rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><div className="flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--primary-fixed)] text-[var(--primary)]"><UserCircle size={36} weight="fill" /></span><div><h2 className="font-heading text-2xl font-bold text-[var(--on-surface)]">{data.child.fullName}</h2><p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Mã học sinh: {data.child.studentCode}</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-[var(--surface-low)] p-4"><p className="font-body text-xs text-[var(--on-surface-variant)]">Lớp học</p><p className="mt-1 font-heading text-base font-bold text-[var(--on-surface)]">{data.child.className}</p></div><div className="rounded-2xl bg-[var(--surface-low)] p-4"><p className="font-body text-xs text-[var(--on-surface-variant)]">Năm học</p><p className="mt-1 font-heading text-base font-bold text-[var(--on-surface)]">{data.child.schoolYearName}</p></div></div></section><section className="mt-6 rounded-[1.5rem] bg-[var(--surface-low)] p-5"><div className="flex items-center gap-3"><ShieldCheck size={24} className="text-[var(--positive)]" weight="fill" /><div><h2 className="font-heading text-base font-bold text-[var(--on-surface)]">Quyền riêng tư</h2><p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Bạn chỉ có thể xem dữ liệu của học sinh đã được nhà trường liên kết với tài khoản này.</p></div></div><div className="mt-4 flex items-center gap-3"><LinkBreak size={22} className="text-[var(--primary)]" /><p className="font-body text-sm text-[var(--on-surface-variant)]">Liên kết phụ huynh được quản lý bởi giáo viên/quản trị viên.</p></div></section></ParentShell>;
}
