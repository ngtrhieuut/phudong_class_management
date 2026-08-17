import Link from "next/link";
import { ArrowLeft, CheckCircle, Gift, Notebook, Star, Trophy } from "@phosphor-icons/react/dist/ssr";
import { AppShell } from "@/components/layout/app-shell";
import { dashboardStudents } from "@/lib/demo-data";

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const student = dashboardStudents.find((item) => item.id === studentId) ?? dashboardStudents[0];

  return (
    <AppShell active="Học sinh">
      <div className="mx-auto max-w-5xl px-5 py-7 sm:px-8">
        <Link href="/teacher/students" className="inline-flex min-h-11 items-center gap-2 font-heading text-sm font-bold text-[var(--primary)] hover:underline">
          <ArrowLeft size={18} weight="bold" /> Quay lại danh sách
        </Link>
        <section className="mt-5 overflow-hidden rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-[2rem] bg-[var(--primary-fixed)] font-heading text-4xl font-bold text-[var(--primary)]">
              {student.shortName}
            </div>
            <div className="flex-1">
              <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">{student.group}</p>
              <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">{student.name}</h1>
              <p className="mt-2 font-body text-base text-[var(--on-surface-variant)]">Cấp độ {student.level}: {student.levelLabel}</p>
              <div className="mt-5 max-w-xl">
                <div className="mb-2 flex justify-between font-heading text-xs font-bold text-[var(--on-surface-variant)]">
                  <span>Tiến độ cấp độ tiếp theo</span>
                  <span>{student.progress}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--primary-fixed)]">
                  <div className="h-full rounded-full bg-[var(--positive)]" style={{ width: student.progress + "%" }} />
                </div>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary-container)] px-3 py-2 font-heading text-xs font-bold text-[var(--secondary)]">
              <Star size={16} weight="fill" /> Ngôi sao đang lên
            </span>
          </div>
        </section>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Lifetime score", value: student.points, icon: Star, tone: "text-[var(--secondary)] bg-[#fff2bd]" },
            { label: "Sao có thể đổi", value: student.spendableStars, icon: Gift, tone: "text-[var(--reward)] bg-[#eadcff]" },
            { label: "Nhiệm vụ", value: student.taskStatus, icon: CheckCircle, tone: "text-[var(--positive)] bg-[var(--positive-soft)]" },
          ].map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
              <span className={"flex h-10 w-10 items-center justify-center rounded-full " + tone}><Icon size={21} weight="fill" /></span>
              <p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">{label}</p>
              <p className="mt-1 font-heading text-2xl font-bold text-[var(--on-surface)]">{value}</p>
            </div>
          ))}
        </div>
        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><Notebook size={21} className="text-[var(--primary)]" /> Hoạt động gần đây</h2>
            <div className="mt-5 space-y-4">
              {["Hoàn thành nhiệm vụ Giữ góc học tập gọn gàng", "Nhận sao cho hành vi Giúp đỡ bạn", "Được cô ghi nhận sự tự tin khi phát biểu"].map((item, index) => (
                <div key={item} className="flex gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--primary)]" />
                  <div>
                    <p className="font-body text-sm text-[var(--on-surface)]">{item}</p>
                    <p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{index + 1} ngày trước</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-6">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--primary)]"><Trophy size={21} weight="fill" /> Huy hiệu</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {["Siêu chăm học", "Giúp đỡ bạn bè", "Dũng sĩ phát biểu", "Tiến bộ vượt bậc"].map((badge) => (
                <div key={badge} className="rounded-2xl bg-[var(--surface-lowest)] p-4 text-center shadow-sm">
                  <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Star size={24} weight="fill" /></span>
                  <p className="mt-2 font-heading text-xs font-bold text-[var(--on-surface)]">{badge}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
