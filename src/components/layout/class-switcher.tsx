import Link from "next/link";
import { CaretDown, Check } from "@phosphor-icons/react/dist/ssr";

type ClassOption = { id: string; name: string; schoolYearName: string };

export function ClassSwitcher({ options, selectedId, basePath = "/teacher/dashboard" }: { options: readonly ClassOption[]; selectedId?: string; basePath?: string }) {
  if (options.length === 0) return null;
  const selected = options.find((option) => option.id === selectedId) ?? options[0];
  return <details className="relative"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-[var(--outline-variant)]/50 bg-[var(--surface-lowest)] px-3 py-1 font-heading text-sm font-bold text-[var(--on-surface)]"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]">{selected.name.replace(/[^0-9]/g, "").slice(0, 2) || "L"}</span><span className="hidden max-w-32 truncate sm:block">{selected.name}</span><CaretDown size={16} className="text-[var(--on-surface-variant)]" /></summary><div className="absolute right-0 top-14 z-50 w-64 rounded-2xl border border-[var(--surface-high)] bg-[var(--surface-lowest)] p-2 shadow-xl">{options.map((option) => <Link key={option.id} prefetch={false} href={`${basePath}?classId=${encodeURIComponent(option.id)}`} className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-[var(--surface-low)]"><span><span className="block font-heading text-sm font-bold text-[var(--on-surface)]">{option.name}</span><span className="block font-body text-xs text-[var(--on-surface-variant)]">{option.schoolYearName}</span></span>{option.id === selected.id ? <Check size={17} className="text-[var(--positive)]" /> : null}</Link>)}</div></details>;
}
