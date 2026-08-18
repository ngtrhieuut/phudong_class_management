import Link from "next/link";
import { ChartBar, ClipboardText, Gear, Gift, House, Plus, Sparkle, UserCircle, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/ui/brand-mark";
import { AvatarImage } from "@/components/ui/avatar-template-picker";

const items = [
  { href: "/teacher/dashboard", label: "Trang chủ", Icon: House },
  { href: "/teacher/students", label: "Học sinh", Icon: UsersThree },
  { href: "/teacher/guardians", label: "Phụ huynh", Icon: UserCircle },
  { href: "/teacher/praise", label: "Góc tuyên dương", Icon: Sparkle },
  { href: "/teacher/tasks", label: "Nhiệm vụ", Icon: ClipboardText },
  { href: "/teacher/rewards", label: "Kho quà", Icon: Gift },
  { href: "/teacher/analytics", label: "Thống kê", Icon: ChartBar },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

function classScopedHref(href: string, selectedClassId?: string) {
  if (!selectedClassId || href.includes("classId=")) return href;
  return `${href}${href.includes("?") ? "&" : "?"}classId=${encodeURIComponent(selectedClassId)}`;
}

export function Sidebar({ active, teacherName = "Tài khoản", teacherAvatarUrl, selectedClassId, className = "Chưa chọn lớp", schoolYearName = "Chưa thiết lập năm học" }: { active: string; teacherName?: string; teacherAvatarUrl?: string | null; selectedClassId?: string; className?: string; schoolYearName?: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-r-[2rem] bg-[var(--surface-low)] md:flex">
      <div className="border-b border-[var(--surface-high)] p-6">
        <BrandMark />
        <div className="mt-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--secondary-container)] text-2xl font-bold text-[var(--secondary)]">
            {className.replace(/[^0-9]/g, "").slice(0, 2) || "L"}
          </div>
          <div>
            <p className="font-heading text-lg font-bold text-[var(--primary)]">{className}</p>
            <p className="font-body text-xs text-[var(--on-surface-variant)]">Năm học {schoolYearName}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {items.map(({ href, label, Icon }) => {
          const selected = active === label;
          return (
            <Link
              key={href}
              href={classScopedHref(href, selectedClassId)}
              prefetch={false}
              className={"flex min-h-12 items-center gap-3 rounded-2xl px-4 font-heading text-sm font-bold transition " + (selected ? "bg-[var(--primary-container)] text-white shadow-md shadow-blue-900/10" : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)] hover:text-[var(--primary)]")}
            >
              <Icon size={22} weight={selected ? "fill" : "regular"} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4">
        <Link
          href="/teacher/students?add=1"
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-4 font-heading text-sm font-bold text-white shadow-md shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98]"
        >
          <Plus size={20} weight="bold" /> Thêm học sinh
        </Link>
        <Link href="/teacher/settings" className="group mt-4 flex items-center justify-between rounded-2xl bg-[var(--surface-lowest)] px-3 py-2 transition hover:-translate-y-0.5 hover:bg-[var(--surface-container)] hover:shadow-md">
          <div className="flex items-center gap-2">
            {teacherAvatarUrl ? <AvatarImage src={teacherAvatarUrl} alt={`Avatar của ${teacherName}`} size={36} className="h-9 w-9 rounded-full" /> : <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-fixed)] font-heading text-sm font-bold text-[var(--primary)]">{initials(teacherName)}</div>}
            <span className="max-w-28 truncate font-heading text-xs font-bold text-[var(--on-surface)]">{teacherName}</span>
          </div>
          <Gear size={18} className="text-[var(--on-surface-variant)] transition group-hover:text-[var(--primary)]" />
        </Link>
      </div>
    </aside>
  );
}
