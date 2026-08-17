import { Bell, CaretDown, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { BrandMark } from "@/components/ui/brand-mark";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function TopBar({ teacherName = "Tài khoản" }: { teacherName?: string }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-[var(--surface-high)] bg-[var(--surface)]/95 px-5 backdrop-blur sm:px-8">
      <div className="md:hidden">
        <BrandMark compact />
      </div>
      <label className="relative hidden max-w-xl flex-1 md:block">
        <span className="sr-only">Tìm kiếm</span>
        <MagnifyingGlass size={21} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
        <input
          type="search"
          placeholder="Tìm học sinh, hoạt động..."
          className="min-h-12 w-full rounded-full border-2 border-transparent bg-[var(--surface-low)] pl-12 pr-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary-fixed)] focus:bg-[var(--surface-lowest)]"
        />
      </label>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <button aria-label="Thông báo" className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)] active:scale-95">
          <Bell size={22} weight="regular" />
          <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--surface)] bg-[var(--needs-improvement)]" />
        </button>
        <div className="hidden h-8 w-px bg-[var(--outline-variant)]/60 sm:block" />
        <button className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--outline-variant)]/50 bg-[var(--surface-lowest)] p-1 pr-3 transition hover:border-[var(--primary)]">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-fixed)] font-heading font-bold text-[var(--primary)]">{initials(teacherName)}</span>
          <span className="hidden max-w-32 truncate font-heading text-sm font-bold text-[var(--on-surface)] sm:block">{teacherName}</span>
          <CaretDown size={16} className="text-[var(--on-surface-variant)]" />
        </button>
      </div>
    </header>
  );
}
