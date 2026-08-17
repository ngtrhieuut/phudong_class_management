import { ChartBar, CheckCircle, FileCsv, Star, TrendUp } from "@phosphor-icons/react/dist/ssr";

import { AppShell } from "@/components/layout/app-shell";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getClassAnalytics, getTeacherClass, getTeacherClasses } from "@/lib/classroom/queries";
import {
  currentReportMonth,
  DEFAULT_REPORT_PAGE_SIZE,
  MAX_REPORT_PAGE_SIZE,
  parseReportMonth,
} from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

type AnalyticsSearchParams = {
  classId?: string;
  month?: string;
  reportPage?: string;
  reportPageSize?: string;
};

function boundedInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= max ? parsed : fallback;
}

export default async function TeacherAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsSearchParams>;
}) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });
  const params = await searchParams;
  const classId = params.classId;
  const [classContext, classOptions] = await Promise.all([
    getTeacherClass(session.user.id, classId),
    getTeacherClasses(session.user.id),
  ]);

  if (!classContext) {
    return (
      <AppShell
        active="Thống kê"
        classOptions={classOptions}
        selectedClassId={classId}
        classSwitcherPath="/teacher/analytics"
        teacherName={appUser.displayName}
      >
        <div className="mx-auto max-w-3xl px-5 py-16 text-center">
          <h1 className="font-heading text-3xl font-bold text-[var(--primary)]">Chưa có lớp được phân công</h1>
        </div>
      </AppShell>
    );
  }

  const analytics = await getClassAnalytics(session.user.id, classContext.id);
  const totals = analytics.totals;
  const daily = analytics.dailyScores.map((item) => ({ ...item, total: Number(item.total) }));
  const maxDaily = Math.max(1, ...daily.map((item) => Math.abs(item.total)));
  const totalAssignments = Number(analytics.taskStats.totalAssignments ?? 0);
  const completedAssignments = Number(analytics.taskStats.completedAssignments ?? 0);
  const completionRate = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;
  const badgesEarned = Number(analytics.badgesEarned ?? 0);
  const rewardRedemptions = Number(analytics.rewardRedemptions ?? 0);
  const month = parseReportMonth(params.month ?? "")?.month ?? currentReportMonth();
  const reportPage = boundedInteger(params.reportPage, 1, 10_000);
  const reportPageSize = boundedInteger(params.reportPageSize, DEFAULT_REPORT_PAGE_SIZE, MAX_REPORT_PAGE_SIZE);
  const paginatedReportQuery = new URLSearchParams({
    classId: classContext.id,
    page: String(reportPage),
    pageSize: String(reportPageSize),
  });
  const monthlyReportQuery = new URLSearchParams({
    classId: classContext.id,
    month,
    page: String(reportPage),
    pageSize: String(reportPageSize),
  });

  return (
    <AppShell
      active="Thống kê"
      classOptions={classOptions}
      selectedClassId={classContext.id}
      classSwitcherPath="/teacher/analytics"
      teacherName={appUser.displayName}
      className={classContext.name}
      schoolYearName={classContext.schoolYearName}
    >
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Nhìn thấy tiến bộ</p>
        <h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Thống kê lớp học</h1>
        <p className="mt-3 max-w-xl font-body text-base leading-7 text-[var(--on-surface-variant)]">
          Tập trung vào xu hướng của cả lớp, không biến dữ liệu thành bảng xếp hạng.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fff2bd] text-[var(--secondary)]"><Star size={22} weight="fill" /></span>
            <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Tổng điểm tích cực</p>
            <p className="mt-1 font-heading text-3xl font-bold text-[var(--on-surface)]">{totals?.lifetimeScore ?? 0}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--positive-soft)] text-[var(--positive)]"><CheckCircle size={22} weight="fill" /></span>
            <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Hoàn thành nhiệm vụ</p>
            <p className="mt-1 font-heading text-3xl font-bold text-[var(--on-surface)]">{completionRate}%</p>
            <p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{completedAssignments}/{totalAssignments} lượt</p>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><ChartBar size={22} /></span>
            <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Huy hiệu đã trao</p>
            <p className="mt-1 font-heading text-3xl font-bold text-[var(--on-surface)]">{badgesEarned}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Star size={22} weight="fill" /></span>
            <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Lượt đổi quà</p>
            <p className="mt-1 font-heading text-3xl font-bold text-[var(--on-surface)]">{rewardRedemptions}</p>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-[var(--primary)]"><TrendUp size={22} weight="fill" /></span>
            <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Học sinh đang hoạt động</p>
            <p className="mt-1 font-heading text-3xl font-bold text-[var(--on-surface)]">{totals?.studentCount ?? 0}</p>
          </div>
        </div>

        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><FileCsv size={22} className="text-[var(--primary)]" /> Xuất báo cáo CSV</h2>
              <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-[var(--on-surface-variant)]">
                Chỉ tài khoản có quyền xem lớp này mới tải được dữ liệu. Ledger và lượt giao nhiệm vụ được phân trang, tối đa {MAX_REPORT_PAGE_SIZE} dòng mỗi file.
              </p>
            </div>
            <form method="get" action="/teacher/analytics" className="grid grid-cols-2 gap-3 sm:min-w-80">
              <input type="hidden" name="classId" value={classContext.id} />
              <label className="col-span-2 font-body text-xs font-semibold text-[var(--on-surface-variant)]">
                Tháng tổng hợp
                <input name="month" type="month" defaultValue={month} className="mt-1 block min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]" />
              </label>
              <label className="font-body text-xs font-semibold text-[var(--on-surface-variant)]">
                Trang
                <input name="reportPage" type="number" min="1" max="10000" defaultValue={reportPage} className="mt-1 block min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]" />
              </label>
              <label className="font-body text-xs font-semibold text-[var(--on-surface-variant)]">
                Dòng mỗi file
                <select name="reportPageSize" defaultValue={String(reportPageSize)} className="mt-1 block min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]">
                  <option value="250">250</option>
                  <option value="500">500</option>
                </select>
              </label>
              <button type="submit" className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--primary)] px-4 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]">Áp dụng phạm vi</button>
            </form>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <a href={`/api/teacher/reports/activity?${paginatedReportQuery.toString()}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--surface-low)] px-4 font-heading text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--surface-container)]"><FileCsv size={19} /> Activity / score ledger</a>
            <a href={`/api/teacher/reports/assignments?${paginatedReportQuery.toString()}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--surface-low)] px-4 font-heading text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--surface-container)]"><FileCsv size={19} /> Task assignments</a>
            <a href={`/api/teacher/reports/monthly-summary?${monthlyReportQuery.toString()}`} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[var(--secondary-container)] px-4 font-heading text-sm font-bold text-[var(--secondary)] transition hover:bg-[#ffe16d]"><FileCsv size={19} /> Monthly summary · {month}</a>
          </div>
          <p className="mt-4 font-body text-xs leading-5 text-[var(--on-surface-variant)]">Nếu response có nhiều trang, tăng số Trang rồi tải tiếp. Nội dung CSV được escape và bảo vệ khỏi công thức spreadsheet.</p>
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><ChartBar size={22} className="text-[var(--primary)]" /> Điểm theo ngày · 30 ngày</h2>
          {daily.length > 0 ? (
            <div className="mt-8 flex h-56 items-end gap-2 overflow-x-auto border-b border-l border-[var(--outline-variant)] px-3 pb-0 sm:gap-4">
              {daily.map((item) => (
                <div key={item.day} className="flex min-w-7 flex-1 flex-col items-center gap-2">
                  <div className={`w-full max-w-12 rounded-t-full ${item.total < 0 ? "bg-[var(--needs-improvement)]" : "bg-[var(--primary)]"}`} style={{ height: `${Math.max(8, Math.round((Math.abs(item.total) / maxDaily) * 100))}%` }} title={`${item.day}: ${item.total}`} />
                  <span className="font-body text-[10px] text-[var(--on-surface-variant)]">{item.day.slice(5)}</span>
                </div>
              ))}
            </div>
          ) : <p className="mt-6 font-body text-sm text-[var(--on-surface-variant)]">Chưa có dữ liệu điểm trong 30 ngày gần đây.</p>}
        </section>

        <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Phân loại ghi nhận</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {analytics.behaviorBreakdown.map((item) => (
              <div key={item.transactionType} className="flex items-center justify-between rounded-2xl bg-[var(--surface-low)] p-4">
                <span className="font-body text-sm text-[var(--on-surface-variant)]">{item.transactionType}</span>
                <span className="font-heading text-lg font-bold text-[var(--primary)]">{item.total}</span>
              </div>
            ))}
            {analytics.behaviorBreakdown.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa có dữ liệu phân loại.</p> : null}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
