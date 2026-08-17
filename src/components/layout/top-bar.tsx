import { Bell, CaretDown, Gear, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";
import { AvatarImage } from "@/components/ui/avatar-template-picker";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
}

export function TopBar({ teacherName = "Tài khoản", teacherAvatarUrl, selectedClassId }: { teacherName?: string; teacherAvatarUrl?: string | null; selectedClassId?: string }) {
  return (
    <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-[var(--surface-high)] bg-[var(--surface)]/95 px-5 backdrop-blur sm:px-8">
      <div className="md:hidden">
        <BrandMark compact />
      </div>
      <form method="get" action="/teacher/students" className="relative hidden max-w-xl flex-1 md:block">
        <span className="sr-only">Tìm kiếm</span>
        <MagnifyingGlass size={21} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
        <input
          name="q"
          type="search"
          placeholder="Tìm học sinh hoặc phụ huynh..."
          className="min-h-12 w-full rounded-full border-2 border-transparent bg-[var(--surface-low)] pl-12 pr-4 font-body text-[var(--on-surface)] outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary-fixed)] focus:bg-[var(--surface-lowest)]"
        />
        {selectedClassId ? <input type="hidden" name="classId" value={selectedClassId} /> : null}
      </form>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <Link href="/teacher/notifications" aria-label="Thông báo" className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)] active:scale-95">
          <Bell size={22} weight="regular" />
        </Link>
        <Link href="/teacher/settings" aria-label="Cài đặt tài khoản" className="relative flex h-11 w-11 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)] hover:text-[var(--primary)] active:scale-95">
          <Gear size={21} />
        </Link>
        <div className="hidden h-8 w-px bg-[var(--outline-variant)]/60 sm:block" />
        <Link href="/teacher/settings" className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--outline-variant)]/50 bg-[var(--surface-lowest)] p-1 pr-3 transition hover:-translate-y-0.5 hover:border-[var(--primary)] hover:shadow-md">
          {teacherAvatarUrl ? <AvatarImage src={teacherAvatarUrl} alt={`Avatar của ${teacherName}`} size={36} className="h-9 w-9 rounded-full" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-fixed)] font-heading font-bold text-[var(--primary)]">{initials(teacherName)}</span>}
          <span className="hidden max-w-32 truncate font-heading text-sm font-bold text-[var(--on-surface)] sm:block">{teacherName}</span>
          <CaretDown size={16} className="text-[var(--on-surface-variant)]" />
        </Link>
      </div>
    </header>
  );
}
