import { Star } from "@phosphor-icons/react/dist/ssr";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-md shadow-blue-900/10">
        <Star size={23} weight="fill" />
      </span>
      {!compact ? (
        <div>
          <p className="font-heading text-sm font-bold tracking-wide text-[var(--primary)]">PHÙ ĐỔNG</p>
          <p className="font-body text-xs text-[var(--on-surface-variant)]">Class Management</p>
        </div>
      ) : null}
    </div>
  );
}
