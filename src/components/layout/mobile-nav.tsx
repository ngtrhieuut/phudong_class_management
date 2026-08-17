import Link from "next/link";
import { ChartBar, ClipboardText, House, Plus, Sparkle, UsersThree } from "@phosphor-icons/react/dist/ssr";

const items = [
  { href: "/teacher/dashboard", label: "Trang chủ", Icon: House },
  { href: "/teacher/students", label: "Học sinh", Icon: UsersThree },
  { href: "/teacher/students?score=1", label: "Cộng điểm", Icon: Plus, primary: true },
  { href: "/teacher/praise", label: "Tuyên dương", Icon: Sparkle },
  { href: "/teacher/tasks", label: "Nhiệm vụ", Icon: ClipboardText },
  { href: "/teacher/analytics", label: "Thống kê", Icon: ChartBar },
];

export function MobileNav({ active }: { active: string }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[76px] items-center justify-around border-t border-[var(--surface-high)] bg-[var(--surface-lowest)]/95 px-2 pb-2 shadow-[0_-4px_16px_rgb(0_93_167_/_0.08)] backdrop-blur md:hidden">
      {items.map(({ href, label, Icon, primary }) => {
        const selected = active === label;
        if (primary) {
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className="flex min-h-12 min-w-14 -translate-y-3 flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--primary)] px-3 text-white shadow-lg shadow-blue-900/20 transition active:scale-95"
            >
              <Icon size={27} weight="bold" />
              <span className="font-heading text-[10px] font-bold">{label}</span>
            </Link>
          );
        }
        return (
          <Link
            key={href}
            href={href}
            className={"flex min-h-12 min-w-14 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 transition " + (selected ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]")}
          >
            <Icon size={21} weight={selected ? "fill" : "regular"} />
            <span className="font-heading text-[10px] font-bold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
