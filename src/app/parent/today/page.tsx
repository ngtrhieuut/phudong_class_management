import Link from "next/link";
import { ArrowRight, Bell, CheckCircle, Clock, Gift, House, Medal, Sparkle, Star, TrendUp, UsersThree } from "@phosphor-icons/react/dist/ssr";

export const dynamic = "force-dynamic";

export default function ParentTodayPage() {
  return (
    <main className="min-h-[100dvh] bg-[var(--surface)] pb-24">
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-[var(--surface-high)] bg-[var(--surface)]/95 px-5 backdrop-blur md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-fixed)] font-heading font-bold text-[var(--primary)]">M</span>
          <div>
            <p className="font-heading text-lg font-bold text-[var(--primary)]">Lớp 1/6</p>
            <p className="font-body text-xs text-[var(--on-surface-variant)]">Phù Đổng</p>
          </div>
        </div>
        <button aria-label="Thông báo" className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--primary)] transition hover:bg-[var(--surface-container)]"><Bell size={22} weight="fill" /></button>
      </header>
      <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:px-8">
        <section className="relative overflow-hidden rounded-[2rem] bg-[var(--surface-lowest)] p-6 text-center soft-shadow sm:p-8">
          <div className="absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[var(--primary-fixed)]/60" />
          <div className="relative mx-auto flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[var(--primary-fixed)] font-heading text-4xl font-bold text-[var(--primary)]">MA</div>
          <h1 className="relative mt-5 font-heading text-3xl font-bold text-[var(--primary)]">Mai Anh</h1>
          <span className="relative mt-2 inline-flex items-center gap-1 rounded-full bg-[var(--tertiary-container)]/20 px-3 py-1 font-heading text-xs font-bold text-[var(--tertiary)]"><Medal size={15} weight="fill" /> Người truyền cảm hứng</span>
          <p className="relative mt-3 font-body text-sm text-[var(--on-surface-variant)]">Cấp độ hiện tại: <strong>Level 4</strong></p>
          <div className="relative mx-auto mt-5 max-w-lg rounded-2xl bg-[var(--surface-low)] p-4 text-left">
            <div className="flex justify-between font-heading text-xs font-bold text-[var(--primary)]"><span>Tiến độ lên Level 5</span><span>72/100 sao</span></div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-[var(--primary-fixed)]"><div className="h-full w-[72%] rounded-full bg-[var(--positive)]" /></div>
            <p className="mt-2 text-right font-body text-xs text-[var(--on-surface-variant)]">Còn 28 sao nữa để mở cấp độ mới.</p>
          </div>
        </section>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <section className="rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Star size={19} weight="fill" /></span><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Tổng kết hôm nay</h2></div>
            <p className="mt-6 font-heading text-2xl font-bold leading-tight text-[var(--primary)]">Con đã đạt được <span className="text-4xl text-[var(--secondary-container)]">5</span> sao hôm nay.</p>
            <p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Tuyệt vời. Con đang làm rất tốt.</p>
            <button className="mt-6 inline-flex min-h-11 items-center gap-1 rounded-full bg-[var(--surface-low)] px-4 font-heading text-xs font-bold text-[var(--primary)]">Xem chi tiết <ArrowRight size={16} /></button>
          </section>
          <section className="rounded-[2rem] bg-[var(--needs-improvement-soft)] p-6 soft-shadow">
            <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--needs-improvement)] text-white"><Bell size={18} weight="fill" /></span><h2 className="font-heading text-xl font-bold text-[var(--needs-improvement)]">Thông báo mới nhất</h2></div>
            <div className="mt-6 rounded-2xl bg-white/70 p-4"><p className="font-body text-sm leading-6 text-[var(--on-surface)]">Cô Mai vừa tuyên dương con trên bảng tin của lớp.</p><p className="mt-2 font-body text-xs text-[var(--on-surface-variant)]">10 phút trước</p></div>
          </section>
        </div>
        <section>
          <h2 className="px-2 font-heading text-2xl font-bold text-[var(--on-surface)]">Hôm nay của con</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: "Lịch sử điểm", detail: "Xem chi tiết sao nhận và điều chỉnh", icon: Clock },
              { label: "Bộ sưu tập huy hiệu", detail: "Những cột mốc Mai Anh đã đạt", icon: Medal },
              { label: "Nhiệm vụ tuần", detail: "Theo dõi việc đang thực hiện", icon: CheckCircle },
              { label: "Kho quà", detail: "Đổi sao lấy đặc quyền vui vẻ", icon: Gift },
            ].map(({ label, detail, icon: Icon }) => (
              <Link key={label} href="#" className="flex min-h-20 items-center gap-4 rounded-2xl bg-[var(--surface-lowest)] p-4 soft-shadow transition hover:bg-[var(--surface-low)]">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--primary)]"><Icon size={23} weight="fill" /></span>
                <span className="min-w-0 flex-1"><span className="block font-heading text-sm font-bold text-[var(--on-surface)]">{label}</span><span className="mt-1 block font-body text-xs text-[var(--on-surface-variant)]">{detail}</span></span>
                <ArrowRight size={18} className="text-[var(--outline)]" />
              </Link>
            ))}
          </div>
        </section>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[76px] items-center justify-around border-t border-[var(--surface-high)] bg-[var(--surface-lowest)] px-3 pb-2 shadow-[0_-4px_16px_rgb(0_93_167_/_0.08)]">
        {[
          { label: "Hôm nay", icon: House, active: true },
          { label: "Tiến bộ", icon: TrendUp },
          { label: "Tuyên dương", icon: Sparkle },
          { label: "Hồ sơ", icon: UsersThree },
        ].map(({ label, icon: Icon, active }) => (
          <button key={label} className={"flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-2xl px-2 " + (active ? "text-[var(--primary)]" : "text-[var(--on-surface-variant)]")}><Icon size={21} weight={active ? "fill" : "regular"} /><span className="font-heading text-[10px] font-bold">{label}</span></button>
        ))}
      </nav>
    </main>
  );
}
