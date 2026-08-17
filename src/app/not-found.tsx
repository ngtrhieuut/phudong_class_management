import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[var(--surface)] p-5">
      <section className="w-full max-w-lg rounded-[2rem] bg-[var(--surface-lowest)] p-8 text-center soft-shadow">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">404</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[var(--primary)]">Không tìm thấy trang</h1>
        <p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Trang này có thể đã được chuyển hoặc bạn không có quyền truy cập.</p>
        <Link href="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white">Về trang chủ</Link>
      </section>
    </main>
  );
}
