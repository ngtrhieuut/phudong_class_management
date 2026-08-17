import { ChartBar, CheckCircle, Star, TrendUp } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/layout/app-shell";
import { requireUserSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function TeacherAnalyticsPage() {
  await requireUserSession();

  return (
    <AppShell active="Thống kê">
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Nhìn thấy tiến bộ</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Thống kê lớp học</h1>
        <p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">Tập trung vào xu hướng của cả lớp, không biến dữ liệu thành bảng xếp hạng.</p>
        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { label: "Sao tích cực tuần này", value: "86", change: "+18%", icon: Star, tone: "text-[var(--secondary)] bg-[#fff2bd]" },
            { label: "Nhiệm vụ hoàn thành", value: "74%", change: "+6%", icon: CheckCircle, tone: "text-[var(--positive)] bg-[var(--positive-soft)]" },
            { label: "Học sinh có tiến bộ", value: "21", change: "+4 bạn", icon: TrendUp, tone: "text-[var(--primary)] bg-[var(--primary-fixed)]" },
          ].map(({ label, value, change, icon: Icon, tone }) => (
            <div key={label} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
              <span className={"flex h-11 w-11 items-center justify-center rounded-full " + tone}><Icon size={22} weight="fill" /></span>
              <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">{label}</p>
              <div className="mt-1 flex items-end justify-between gap-2"><p className="font-heading text-3xl font-bold text-[var(--on-surface)]">{value}</p><span className="font-heading text-xs font-bold text-[var(--positive)]">{change}</span></div>
            </div>
          ))}
        </div>
        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><ChartBar size={22} className="text-[var(--primary)]" /> Nhịp tiến bộ 7 ngày</h2>
          <div className="mt-8 flex h-56 items-end gap-3 border-b border-l border-[var(--outline-variant)] px-3 pb-0 sm:gap-6">
            {[42, 58, 46, 72, 64, 88, 78].map((height, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-2">
                <div className="w-full max-w-12 rounded-t-full bg-[var(--primary)]" style={{ height: height + "%" }} />
                <span className="font-body text-xs text-[var(--on-surface-variant)]">{["T2", "T3", "T4", "T5", "T6", "T7", "CN"][index]}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
