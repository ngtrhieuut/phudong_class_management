import Link from "next/link";
import { ArrowRight, CheckCircle, ShieldCheck, Sparkle, Star, UsersThree } from "@phosphor-icons/react/dist/ssr";

export default function Home() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[var(--surface)]">
      <section className="mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-center gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20 lg:px-12 lg:py-20">
        <div className="order-2 lg:order-1">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--primary)] text-white shadow-lg shadow-blue-900/10">
              <Star size={27} weight="fill" />
            </span>
            <div>
              <p className="font-heading text-sm font-bold tracking-wide text-[var(--primary)]">PHÙ ĐỔNG</p>
              <p className="font-body text-sm text-[var(--on-surface-variant)]">Class Management</p>
            </div>
          </div>
          <p className="mb-4 font-heading text-sm font-bold uppercase tracking-[0.16em] text-[var(--tertiary)]">
            Mỗi hành động tốt, một ngôi sao sáng
          </p>
          <h1 className="max-w-xl font-heading text-5xl font-bold leading-[1.08] tracking-[-0.03em] text-[var(--primary)] sm:text-6xl">
            Lớp học tiến bộ từng ngày.
          </h1>
          <p className="mt-6 max-w-lg font-body text-lg leading-8 text-[var(--on-surface-variant)]">
            Ghi nhận hành vi tích cực, quản lý điểm minh bạch và giúp phụ huynh đồng hành nhẹ nhàng cùng con.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/auth/sign-in"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white shadow-lg shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98]"
            >
              Đăng nhập hệ thống <ArrowRight size={18} weight="bold" />
            </Link>
            <Link
              href="/parent/today"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border-2 border-[var(--primary-fixed)] bg-[var(--surface-lowest)] px-6 font-heading text-sm font-bold text-[var(--primary)] transition hover:border-[var(--primary)] active:scale-[0.98]"
            >
              Xem trải nghiệm phụ huynh
            </Link>
          </div>
          <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { icon: CheckCircle, label: "Ghi nhận nhanh" },
              { icon: ShieldCheck, label: "Phân quyền rõ" },
              { icon: UsersThree, label: "Cùng đồng hành" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 font-body text-sm font-semibold text-[var(--on-surface-variant)]">
                <Icon size={20} weight="fill" className="text-[var(--positive)]" />
                {label}
              </div>
            ))}
          </div>
        </div>
        <div className="order-1 relative min-h-[360px] lg:order-2 lg:min-h-[560px]">
          <div className="absolute inset-8 rounded-[2.5rem] bg-[var(--surface-container)] sm:inset-14" />
          <div className="absolute left-0 top-8 max-w-[210px] rounded-3xl border border-white/70 bg-white/90 p-4 shadow-xl shadow-blue-900/10 backdrop-blur sm:left-5 sm:top-20">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-heading text-xs font-bold text-[var(--on-surface-variant)]">Hôm nay</span>
              <Sparkle size={18} weight="fill" className="text-[var(--secondary-container)]" />
            </div>
            <p className="font-heading text-3xl font-bold text-[var(--secondary)]">+24</p>
            <p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">ngôi sao tích cực</p>
          </div>
          <div className="absolute bottom-8 right-0 max-w-[230px] rounded-3xl border border-white/70 bg-white/95 p-4 shadow-xl shadow-blue-900/10 backdrop-blur sm:right-5 sm:bottom-20">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--positive-soft)] text-[var(--positive)]">
                <CheckCircle size={22} weight="fill" />
              </span>
              <div>
                <p className="font-heading text-sm font-bold text-[var(--on-surface)]">Tiến bộ được nhìn thấy</p>
                <p className="mt-1 font-body text-xs leading-5 text-[var(--on-surface-variant)]">Mỗi việc tốt đều có một dấu mốc rõ ràng.</p>
              </div>
            </div>
          </div>
          <div className="relative mx-auto flex h-full max-w-[420px] items-center justify-center overflow-hidden rounded-[2.5rem] border-8 border-white/80 bg-[var(--surface-low)] shadow-2xl shadow-blue-900/10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgb(255_255_255_/_0.9),transparent_28%),radial-gradient(circle_at_85%_80%,rgb(252_212_0_/_0.32),transparent_30%)]" />
            <div className="relative mx-8 w-full rounded-[2rem] bg-white/85 p-6 shadow-lg shadow-blue-900/5">
              <div className="flex items-center justify-between border-b border-[var(--surface-high)] pb-4">
                <div>
                  <p className="font-heading text-xs font-bold text-[var(--primary)]">LỚP 1/6</p>
                  <p className="font-heading text-xl font-bold text-[var(--on-surface)]">Chào cô Mai</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]">
                  <Star size={24} weight="fill" />
                </span>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-[var(--surface-low)] p-4">
                  <p className="font-body text-xs text-[var(--on-surface-variant)]">Học sinh</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-[var(--primary)]">32</p>
                </div>
                <div className="rounded-2xl bg-[var(--positive-soft)] p-4">
                  <p className="font-body text-xs text-[var(--on-surface-variant)]">Nhiệm vụ</p>
                  <p className="mt-1 font-heading text-2xl font-bold text-[var(--positive)]">8/10</p>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {["Minh Anh", "Gia Hân", "Đức Khoa"].map((name, index) => (
                  <div key={name} className="flex items-center gap-3 rounded-2xl bg-[var(--surface)] p-3">
                    <span className={"flex h-10 w-10 items-center justify-center rounded-2xl font-heading text-sm font-bold " + (index === 0 ? "bg-[#ffe68a] text-[#705d00]" : index === 1 ? "bg-[#ffd5c7] text-[#974400]" : "bg-[#d4e3ff] text-[#005da7]")}>
                      {name.charAt(0)}
                    </span>
                    <span className="flex-1 font-heading text-sm font-bold text-[var(--on-surface)]">{name}</span>
                    <span className="font-heading text-sm font-bold text-[var(--secondary)]">+{index + 2}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
