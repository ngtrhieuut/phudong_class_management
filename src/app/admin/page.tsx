import { ClipboardText, ShieldCheck, UserCircle, UsersThree } from "@phosphor-icons/react/dist/ssr";

import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getAdminOverview } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const entityOptions = ["score_transaction", "student_guardian", "praise_post", "reward_redemption", "student_import", "task"];
const actionOptions = ["created", "updated", "linked", "revoked", "scored", "redeemed", "imported"];

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ entityType?: string; action?: string }> }) {
  const session = await requireUserSession();
  await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const params = await searchParams;
  const overview = await getAdminOverview(session.user.id, { entityType: params.entityType, action: params.action });

  if (!overview) return <main className="min-h-[100dvh] bg-[var(--surface)] p-5 md:p-8"><div className="mx-auto max-w-2xl rounded-[2rem] bg-[var(--surface-lowest)] p-10 text-center soft-shadow"><ShieldCheck size={42} className="mx-auto text-[var(--needs-improvement)]" /><h1 className="mt-4 font-heading text-3xl font-bold text-[var(--primary)]">Không có quyền quản trị</h1><p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">Tài khoản này chưa được cấp role admin trong tổ chức.</p></div></main>;

  return (
    <main className="min-h-[100dvh] bg-[var(--surface)] p-5 md:p-8">
      <div className="mx-auto max-w-7xl">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Vận hành an toàn</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Admin foundation</h1>
        <p className="mt-3 max-w-2xl font-body text-sm leading-6 text-[var(--on-surface-variant)]">Tổng quan lớp, thành viên, học sinh, guardian và audit log trong phạm vi tổ chức được cấp quyền.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-2xl bg-[var(--surface-lowest)] p-5 soft-shadow"><UsersThree size={23} className="text-[var(--primary)]" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Lớp học</p><p className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{overview.classes.length}</p></div>
          <div className="rounded-2xl bg-[var(--surface-lowest)] p-5 soft-shadow"><UserCircle size={23} className="text-[var(--secondary)]" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Học sinh hoạt động</p><p className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{overview.studentCount}</p></div>
          <div className="rounded-2xl bg-[var(--surface-lowest)] p-5 soft-shadow"><ShieldCheck size={23} className="text-[var(--positive)]" weight="fill" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Guardian liên kết</p><p className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{overview.guardianCount}</p></div>
          <div className="rounded-2xl bg-[var(--surface-lowest)] p-5 soft-shadow"><UsersThree size={23} className="text-[var(--primary)]" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Thành viên</p><p className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{overview.members.length}</p></div>
          <div className="rounded-2xl bg-[var(--surface-lowest)] p-5 soft-shadow"><ClipboardText size={23} className="text-[var(--secondary)]" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Audit đang xem</p><p className="mt-1 font-heading text-3xl font-bold text-[var(--primary)]">{overview.auditLogs.length}</p></div>
        </div>

        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Audit log</h2>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end" method="get">
            <label className="flex-1 font-body text-sm"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Entity</span><select name="entityType" defaultValue={overview.filters.entityType ?? ""} className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3"><option value="">Tất cả</option>{entityOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <label className="flex-1 font-body text-sm"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Action</span><select name="action" defaultValue={overview.filters.action ?? ""} className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3"><option value="">Tất cả</option>{actionOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
            <button type="submit" className="min-h-11 rounded-full bg-[var(--primary)] px-5 font-heading text-xs font-bold text-white">Lọc audit</button>
            <a href="/admin" className="inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--surface-low)] px-5 font-heading text-xs font-bold text-[var(--primary)]">Xóa lọc</a>
          </form>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left"><caption className="sr-only">Audit log theo tổ chức</caption><thead><tr><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Thời gian</th><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Actor</th><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Entity</th><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Action</th></tr></thead><tbody>{overview.auditLogs.map((item) => <tr key={item.id} className="border-t border-[var(--surface-high)]"><td className="px-3 py-3 font-body text-sm whitespace-nowrap">{new Date(item.createdAt).toLocaleString("vi-VN")}</td><td className="px-3 py-3 font-body text-sm">{item.actorName}</td><td className="px-3 py-3 font-body text-sm">{item.entityType}<span className="block max-w-48 truncate font-body text-xs text-[var(--on-surface-variant)]">{item.entityId}</span></td><td className="px-3 py-3 font-body text-sm">{item.action}</td></tr>)}{overview.auditLogs.length === 0 ? <tr><td colSpan={4} className="px-3 py-5 font-body text-sm text-[var(--on-surface-variant)]">Chưa có audit log phù hợp.</td></tr> : null}</tbody></table></div>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Lớp học</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left"><caption className="sr-only">Danh sách lớp học thuộc tổ chức</caption><thead><tr><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Tên lớp</th><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Khối</th><th scope="col" className="px-3 py-2 font-heading text-xs text-[var(--on-surface-variant)]">Học sinh</th></tr></thead><tbody>{overview.classes.map((item) => <tr key={item.id} className="border-t border-[var(--surface-high)]"><td className="px-3 py-3 font-body text-sm">{item.name}</td><td className="px-3 py-3 font-body text-sm">{item.grade}</td><td className="px-3 py-3 font-body text-sm">{item.studentCount}</td></tr>)}{overview.classes.length === 0 ? <tr><td colSpan={3} className="px-3 py-5 font-body text-sm text-[var(--on-surface-variant)]">Chưa có lớp.</td></tr> : null}</tbody></table></div></section>
      </div>
    </main>
  );
}
