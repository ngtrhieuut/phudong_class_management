export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-[var(--surface)] p-5 md:p-8" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl space-y-5">
        <span className="sr-only">Đang tải dữ liệu...</span>
        <div className="h-8 w-40 animate-pulse rounded-full bg-[var(--surface-high)]" />
        <div className="h-14 w-2/3 animate-pulse rounded-2xl bg-[var(--surface-high)]" />
        <div className="grid gap-4 sm:grid-cols-3">
          {["one", "two", "three"].map((item) => <div key={item} className="h-32 animate-pulse rounded-[1.5rem] bg-[var(--surface-lowest)] soft-shadow" />)}
        </div>
        <div className="h-72 animate-pulse rounded-[1.5rem] bg-[var(--surface-lowest)] soft-shadow" />
      </div>
    </main>
  );
}
