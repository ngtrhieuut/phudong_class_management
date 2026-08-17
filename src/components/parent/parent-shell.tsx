import Link from "next/link";
import type { ReactNode } from "react";
import { Bell, CaretDown, ChartLineUp, CheckCircle, House, Medal, Sparkle, UserCircle } from "@phosphor-icons/react/dist/ssr";
import { getUserSession } from "@/lib/auth/server";
import { getParentChildren } from "@/lib/parent/queries";

const items = [
  { href: "/parent/today", label: "Hôm nay", Icon: House },
  { href: "/parent/progress", label: "Tiến bộ", Icon: ChartLineUp },
  { href: "/parent/tasks", label: "Nhiệm vụ", Icon: CheckCircle },
  { href: "/parent/badges", label: "Huy hiệu", Icon: Medal },
  { href: "/parent/praise", label: "Tuyên dương", Icon: Sparkle },
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts.at(-1)?.charAt(0) ?? ""}`.toUpperCase();
}

async function getShellChildren() {
  const session = await getUserSession();
  return session?.user ? getParentChildren(session.user.id) : [];
}

export async function ParentShell({
  active,
  childName,
  className,
  studentId,
  childrenOptions,
  children,
}: {
  active: string;
  childName: string;
  className: string;
  studentId: string;
  childrenOptions?: readonly { studentId: string; fullName: string; className: string }[];
  children: ReactNode;
}) {
  const resolvedChildren = childrenOptions ?? await getShellChildren();
  return (
    <main className="min-h-[100dvh] bg-[var(--surface)] pb-24">
      <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between border-b border-[var(--surface-high)] bg-[var(--surface)]/95 px-4 backdrop-blur md:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-fixed)] font-heading font-bold text-[var(--primary)]">{initials(childName)}</span>
          <div className="min-w-0"><Link href={`/parent/today?studentId=${studentId}`} className="block truncate font-heading text-lg font-bold text-[var(--primary)]">{childName}</Link><span className="block truncate font-body text-xs text-[var(--on-surface-variant)]">{className}</span></div>
          {resolvedChildren.length > 1 ? <details className="relative"><summary aria-label="Đổi hồ sơ học sinh" className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--surface-container)]"><CaretDown size={18} /></summary><div className="absolute left-0 top-12 z-50 w-64 rounded-2xl border border-[var(--surface-high)] bg-[var(--surface-lowest)] p-2 shadow-xl">{resolvedChildren.map((option) => <Link key={option.studentId} href={`/parent/today?studentId=${encodeURIComponent(option.studentId)}`} className="flex items-center justify-between rounded-xl px-3 py-3 hover:bg-[var(--surface-low)]"><span className="min-w-0"><span className="block truncate font-heading text-sm font-bold text-[var(--on-surface)]">{option.fullName}</span><span className="block truncate font-body text-xs text-[var(--on-surface-variant)]">{option.className}</span></span>{option.studentId === studentId ? <span className="text-xs font-bold text-[var(--positive)]">Đang xem</span> : null}</Link>)}</div></details> : null}
        </div>
        <div className="flex items-center gap-1"><Link href={`/parent/notifications?studentId=${studentId}`} aria-label="Thông báo" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--surface-container)]"><Bell size={22} /></Link><Link href={`/parent/profile?studentId=${studentId}`} aria-label="Hồ sơ phụ huynh" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--surface-container)]"><UserCircle size={24} weight="fill" /></Link></div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">{children}</div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[76px] items-center justify-around border-t border-[var(--surface-high)] bg-[var(--surface-lowest)] px-2 pb-2 shadow-[0_-4px_16px_rgb(0_93_167_/_0.08)] md:px-6">
        {items.map(({ href, label, Icon }) => {
          const selected = active === label;
          return <Link key={href} href={`${href}?studentId=${studentId}`} className={`flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 ${selected ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]"}`}><Icon size={21} weight={selected ? "fill" : "regular"} /><span className="font-heading text-[10px] font-bold">{label}</span></Link>;
        })}
      </nav>
    </main>
  );
}

export function ParentEmptyState({ message = "Chưa có học sinh được liên kết với tài khoản này." }: { message?: string }) {
  return <div className="rounded-[2rem] bg-[var(--surface-lowest)] p-10 text-center soft-shadow"><Bell size={40} className="mx-auto text-[var(--outline)]" /><h1 className="mt-4 font-heading text-2xl font-bold text-[var(--primary)]">Chưa có dữ liệu</h1><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{message}</p></div>;
}
