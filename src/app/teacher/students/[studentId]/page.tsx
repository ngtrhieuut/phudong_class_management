import Link from "next/link";
import { ArrowLeft, ChartLineUp, CheckCircle, Gift, Notebook, Star, TrendUp, Trophy, WarningCircle } from "@phosphor-icons/react/dist/ssr";

import { AppShell } from "@/components/layout/app-shell";
import { BadgeAwardForm } from "@/components/dashboard/badge-award-form";
import { ScoreAdjustmentForm } from "@/components/dashboard/score-adjustment-form";
import { StudentEditForm } from "@/components/dashboard/student-edit-form";
import { StudentProfileForm } from "@/components/dashboard/student-profile-form";
import { StudentAvatarPicker } from "@/components/ui/avatar-template-picker";
import { ensureAppUser } from "@/lib/auth/app-user";
import { requireUserSession } from "@/lib/auth/server";
import { getTeacherClasses, getTeacherStudentProfile } from "@/lib/classroom/queries";

export const dynamic = "force-dynamic";

function formatPeriod(period: string, type: "week" | "month") {
  return type === "month"
    ? new Date(`${period}-01T00:00:00`).toLocaleDateString("vi-VN", { month: "short", year: "numeric" })
    : new Date(`${period}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default async function StudentDetailPage({ params, searchParams }: { params: Promise<{ studentId: string }>; searchParams: Promise<{ classId?: string }> }) {
  const session = await requireUserSession();
  const appUser = await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name, image: session.user.image });
  const { studentId } = await params;
  const { classId } = await searchParams;
  const [studentData, classOptions] = await Promise.all([
    getTeacherStudentProfile(session.user.id, studentId, classId),
    getTeacherClasses(session.user.id),
  ]);

  if (!studentData) {
    return <AppShell active="Học sinh" classOptions={classOptions} classSwitcherPath="/teacher/students" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl}><div className="mx-auto max-w-3xl px-5 py-16 text-center"><Link href="/teacher/students" className="font-heading text-sm font-bold text-[var(--primary)] hover:underline">Quay lại danh sách</Link><h1 className="mt-5 font-heading text-3xl font-bold text-[var(--primary)]">Không tìm thấy học sinh</h1><p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">Học sinh không thuộc lớp bạn được phân công hoặc đã không còn hoạt động.</p></div></AppShell>;
  }

  const { profile, scores, badges, badgeOptions, levels, weeklyTrend, monthlyTrend, behaviorBreakdown, guardians, classRoles } = studentData;
  const level = [...levels].sort((a, b) => a.sortOrder - b.sortOrder).find((item) => Number(profile.lifetimeScore) >= item.minScore && (item.maxScore === null || Number(profile.lifetimeScore) <= item.maxScore));
  const weekly = weeklyTrend.map((item) => ({ ...item, total: Number(item.total), events: Number(item.events) }));
  const monthly = monthlyTrend.map((item) => ({ ...item, total: Number(item.total), events: Number(item.events) }));
  const maxTrend = Math.max(1, ...weekly.map((item) => Math.abs(item.total)));
  const strengths = behaviorBreakdown.filter((item) => item.category === "positive" && Number(item.total) > 0).slice(0, 5);
  const areas = behaviorBreakdown.filter((item) => item.category === "needs_improvement" || Number(item.total) < 0).slice(0, 5);

  return (
    <AppShell active="Học sinh" classOptions={classOptions} selectedClassId={studentData.classContext.id} classSwitcherPath="/teacher/students" teacherName={appUser.displayName} teacherAvatarUrl={appUser.avatarUrl} className={studentData.classContext.name} schoolYearName={studentData.classContext.schoolYearName}>
      <div className="mx-auto max-w-6xl px-5 py-7 sm:px-8">
        <Link href={`/teacher/students?classId=${studentData.classContext.id}`} className="inline-flex min-h-11 items-center gap-2 font-heading text-sm font-bold text-[var(--primary)] hover:underline"><ArrowLeft size={18} weight="bold" /> Quay lại danh sách</Link>
        <section className="mt-5 overflow-visible rounded-[2rem] bg-[var(--surface-lowest)] p-6 soft-shadow sm:p-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-left">
            <StudentAvatarPicker size={112} classId={studentData.classContext.id} studentId={profile.id} value={profile.avatarUrl} gender={profile.gender === "male" || profile.gender === "female" ? profile.gender : null} fallback={<span className="flex h-28 w-28 items-center justify-center rounded-[2rem] bg-[var(--primary-fixed)] font-heading text-4xl font-bold text-[var(--primary)]">{profile.shortName || profile.fullName.slice(0, 2).toUpperCase()}</span>} />
            <div className="flex-1"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">{profile.groupName || "Chưa phân tổ"} · {profile.studentCode}</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">{profile.fullName}</h1><p className="mt-2 font-body text-base text-[var(--on-surface-variant)]">Level {level?.sortOrder ?? "—"}: {level?.name ?? "Chưa thiết lập"}</p></div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary-container)] px-3 py-2 font-heading text-xs font-bold text-[var(--secondary)]"><Star size={16} weight="fill" /> {profile.spendableStars} sao</span>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.15fr]">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
            <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Thông tin học sinh</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              <div><dt className="font-body text-xs text-[var(--on-surface-variant)]">Ngày sinh</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--on-surface)]">{profile.birthDate ? new Date(`${profile.birthDate}T00:00:00`).toLocaleDateString("vi-VN") : "Chưa cập nhật"}</dd></div>
              <div><dt className="font-body text-xs text-[var(--on-surface-variant)]">Giới tính</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--on-surface)]">{profile.gender === "male" ? "Nam" : profile.gender === "female" ? "Nữ" : profile.gender === "other" ? "Khác" : "Chưa khai báo"}</dd></div>
              <div><dt className="font-body text-xs text-[var(--on-surface-variant)]">Số thứ tự</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--on-surface)]">{profile.seatNo ?? "—"}</dd></div>
              <div><dt className="font-body text-xs text-[var(--on-surface-variant)]">Chức vụ lớp</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--primary)]">{profile.classRoleName || "Chưa phân chức vụ"}</dd></div>
              <div><dt className="font-body text-xs text-[var(--on-surface-variant)]">Nơi sinh</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--on-surface)]">{profile.birthPlace || "Chưa cập nhật"}</dd></div>
              <div><dt className="font-body text-xs text-[var(--on-surface-variant)]">Mã số BHYT</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--on-surface)]">{profile.healthInsuranceNumber || "Chưa cập nhật"}</dd></div>
              <div className="col-span-2"><dt className="font-body text-xs text-[var(--on-surface-variant)]">Địa chỉ</dt><dd className="mt-1 font-heading text-sm font-bold text-[var(--on-surface)]">{[profile.houseNumber, profile.neighborhood, profile.ward].filter(Boolean).join(", ") || "Chưa cập nhật"}</dd></div>
            </dl>
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-6">
            <div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-xl font-bold text-[var(--primary)]">Phụ huynh / người giám hộ</h2><p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Thông tin được lấy từ danh sách Excel của lớp.</p></div><span className="rounded-full bg-[var(--surface-lowest)] px-3 py-1 font-heading text-xs font-bold text-[var(--primary)]">{guardians.length} liên hệ</span></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">{guardians.map((guardian) => <article key={guardian.id} className="rounded-2xl bg-[var(--surface-lowest)] p-4 transition hover:-translate-y-0.5 hover:shadow-md"><p className="font-heading text-sm font-bold text-[var(--on-surface)]">{guardian.fullName}</p><p className="mt-1 font-body text-xs text-[var(--tertiary)]">{guardian.relationship}</p>{guardian.phone ? <p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">☎ Điện thoại liên hệ: {guardian.phone}</p> : <p className="mt-3 font-body text-sm text-[var(--outline)]">Chưa có điện thoại liên hệ</p>}{guardian.occupation ? <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Nghề nghiệp: {guardian.occupation}</p> : null}{guardian.birthYear ? <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Năm sinh: {guardian.birthYear}</p> : null}{guardian.email ? <p className="mt-1 truncate font-body text-xs text-[var(--on-surface-variant)]">{guardian.email}</p> : null}</article>)}{guardians.length === 0 ? <p className="sm:col-span-2 rounded-2xl border border-dashed border-[var(--outline-variant)] p-5 font-body text-sm text-[var(--on-surface-variant)]">Chưa có dữ liệu phụ huynh. Có thể nhập lại file Excel ở mục Nhập danh sách.</p> : null}</div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow"><Star size={21} className="text-[var(--secondary)]" weight="fill" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Lifetime score</p><p className="mt-1 font-heading text-2xl font-bold text-[var(--on-surface)]">{profile.lifetimeScore}</p></div>
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow"><Gift size={21} className="text-[var(--reward)]" weight="fill" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Sao có thể đổi</p><p className="mt-1 font-heading text-2xl font-bold text-[var(--on-surface)]">{profile.spendableStars}</p></div>
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow"><CheckCircle size={21} className="text-[var(--positive)]" weight="fill" /><p className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">Ghi nhận</p><p className="mt-1 font-heading text-2xl font-bold text-[var(--on-surface)]">{scores.length}</p></div>
        </div>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><ChartLineUp size={21} className="text-[var(--primary)]" /> Xu hướng 12 tuần</h2>
            {weekly.length > 0 ? <div className="mt-6 flex h-48 items-end gap-2 overflow-x-auto border-b border-l border-[var(--outline-variant)] px-2 sm:gap-3">{weekly.map((item) => <div key={item.period} className="flex min-w-8 flex-1 flex-col items-center gap-2"><div aria-label={`${formatPeriod(item.period, "week")}: ${item.total} điểm`} className={`w-full max-w-12 rounded-t-full ${item.total < 0 ? "bg-[var(--needs-improvement)]" : "bg-[var(--primary)]"}`} style={{ height: `${Math.max(8, Math.round((Math.abs(item.total) / maxTrend) * 100))}%` }} /><span className="font-body text-[10px] text-[var(--on-surface-variant)]">{formatPeriod(item.period, "week")}</span></div>)}</div> : <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Chưa có dữ liệu 12 tuần gần đây.</p>}
          </div>
          <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-6">
            <h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--primary)]"><TrendUp size={21} weight="fill" /> Theo tháng</h2>
            <div className="mt-5 space-y-3">{monthly.map((item) => <div key={item.period} className="flex items-center justify-between rounded-2xl bg-[var(--surface-lowest)] p-3"><span className="font-body text-sm text-[var(--on-surface-variant)]">{formatPeriod(item.period, "month")} · {item.events} lượt</span><span className={`font-heading text-sm font-bold ${item.total < 0 ? "text-[var(--needs-improvement)]" : "text-[var(--positive)]"}`}>{item.total > 0 ? "+" : ""}{item.total}</span></div>)}{monthly.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa có dữ liệu theo tháng.</p> : null}</div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><Trophy size={21} weight="fill" className="text-[var(--secondary)]" /> Điểm mạnh</h2><div className="mt-5 space-y-3">{strengths.map((item) => <div key={`${item.category}-${item.behaviorName}`} className="flex items-center justify-between rounded-2xl bg-[var(--positive-soft)]/50 p-3"><span className="font-body text-sm text-[var(--on-surface)]">{item.behaviorName}</span><span className="font-heading text-sm font-bold text-[var(--positive)]">+{item.total}</span></div>)}{strengths.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa đủ dữ liệu để xác định điểm mạnh.</p> : null}</div></div>
          <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-6"><h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--primary)]"><WarningCircle size={21} className="text-[var(--needs-improvement)]" /> Khu vực cần cải thiện</h2><div className="mt-5 space-y-3">{areas.map((item) => <div key={`${item.category}-${item.behaviorName}`} className="flex items-center justify-between rounded-2xl bg-[var(--needs-improvement-soft)]/50 p-3"><span className="font-body text-sm text-[var(--on-surface)]">{item.behaviorName}</span><span className="font-heading text-sm font-bold text-[var(--needs-improvement)]">{item.total}</span></div>)}{areas.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa có ghi nhận cần cải thiện.</p> : null}</div></div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--on-surface)]"><Notebook size={21} className="text-[var(--primary)]" /> Hoạt động gần đây</h2><div className="mt-5 space-y-4">{scores.slice(0, 12).map((item) => <div key={item.id} className="flex gap-3"><span className="mt-1 h-3 w-3 shrink-0 rounded-full bg-[var(--primary)]" /><div><p className="font-body text-sm text-[var(--on-surface)]">{item.reason}</p><p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{new Date(item.occurredAt).toLocaleDateString("vi-VN")} · {item.lifetimeDelta > 0 ? `+${item.lifetimeDelta}` : item.spendableDelta} sao</p></div></div>)}{scores.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa có hoạt động.</p> : null}</div></div>
          <div className="rounded-[1.5rem] bg-[var(--surface-low)] p-6"><h2 className="flex items-center gap-2 font-heading text-xl font-bold text-[var(--primary)]"><Trophy size={21} weight="fill" /> Huy hiệu</h2><div className="mt-5 grid grid-cols-2 gap-3">{badges.map((badge) => <div key={badge.id} className="rounded-2xl bg-[var(--surface-lowest)] p-4 text-center shadow-sm"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Star size={24} weight="fill" /></span><p className="mt-2 font-heading text-xs font-bold text-[var(--on-surface)]">{badge.name}</p></div>)}{badges.length === 0 ? <p className="col-span-2 font-body text-sm text-[var(--on-surface-variant)]">Chưa có huy hiệu.</p> : null}</div></div>
        </section>
        <div className="mt-6">
          <StudentEditForm
            classId={studentData.classContext.id}
            studentId={profile.id}
            initial={{
              studentCode: profile.studentCode,
              fullName: profile.fullName,
              birthDate: profile.birthDate,
              gender: profile.gender,
              seatNo: profile.seatNo,
              groupName: profile.groupName,
              avatarUrl: profile.avatarUrl,
              classRoleId: profile.classRoleId,
            }}
            classRoles={classRoles}
          />
        </div>
        <div className="mt-6">
          <StudentProfileForm
            classId={studentData.classContext.id}
            studentId={profile.id}
            initial={{
              birthPlace: profile.birthPlace,
              healthInsuranceNumber: profile.healthInsuranceNumber,
              neighborhood: profile.neighborhood,
              houseNumber: profile.houseNumber,
              ward: profile.ward,
            }}
            guardians={guardians}
          />
        </div>
        <div className="mt-6">
          <BadgeAwardForm
            classId={studentData.classContext.id}
            studentId={profile.id}
            definitions={badgeOptions}
            awardedBadgeIds={badges.map((badge) => badge.id)}
          />
        </div>
        <div className="mt-6">
          <ScoreAdjustmentForm
            classId={studentData.classContext.id}
            studentId={profile.id}
            sourceTransactions={scores.slice(0, 20).map((item) => ({
              id: item.id,
              reason: item.reason,
              lifetimeDelta: Number(item.lifetimeDelta),
              spendableDelta: Number(item.spendableDelta),
              occurredAt: item.occurredAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </AppShell>
  );
}
