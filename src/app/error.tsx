"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface)] p-5">
      <section className="w-full max-w-lg rounded-[2rem] bg-[var(--surface-lowest)] p-8 text-center soft-shadow">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--needs-improvement)]">Có lỗi xảy ra</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[var(--primary)]">Chưa thể tải nội dung</h1>
        <p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Dữ liệu chưa được thay đổi. Hãy thử tải lại hoặc quay lại sau.</p>
        <button type="button" onClick={() => reset()} className="mt-6 min-h-12 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white">Thử lại</button>
      </section>
    </main>
  );
}
