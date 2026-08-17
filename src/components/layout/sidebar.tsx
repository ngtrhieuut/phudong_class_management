import Link from "next/link";
import { ChartBar, Gear, House, Plus, Sparkle, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/ui/brand-mark";

const items = [
  { href: "/teacher/dashboard", label: "Trang chủ", Icon: House },
  { href: "/teacher/students", label: "Học sinh", Icon: UsersThree },
  { href: "/teacher/praise", label: "Góc tuyên dương", Icon: Sparkle },
  { href: "/teacher/analytics", label: "Thống kê", Icon: ChartBar },
];

export function Sidebar({ active }: { active: string }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-r-[2rem] bg-[var(--surface-low)] md:flex">
      <div className="border-b border-[var(--surface-high)] p-6">
        <BrandMark />
        <div className="mt-8 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--secondary-container)] text-2xl font-bold text-[var(--secondary)]">
            1
          </div>
          <div>
            <p className="font-heading text-lg font-bold text-[var(--primary)]">Lớp 1/6</p>
            <p className="font-body text-xs text-[var(--on-surface-variant)]">Năm học 2026-2027</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {items.map(({ href, label, Icon }) => {
          const selected = active === label;
          return (
            <Link
              key={href}
              href={href}
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
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-[var(--surface-lowest)] px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-fixed)] font-heading text-sm font-bold text-[var(--primary)]">M</div>
            <span className="font-heading text-xs font-bold text-[var(--on-surface)]">Cô Mai</span>
          </div>
          <Gear size={18} className="text-[var(--on-surface-variant)]" />
        </div>
      </div>
    </aside>
  );
}
