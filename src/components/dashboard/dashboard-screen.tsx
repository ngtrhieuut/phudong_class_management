"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarCheck,
  Check,
  CheckCircle,
  ChatCircleText,
  Clock,
  Plus,
  Sparkle,
  Star,
  X,
} from "@phosphor-icons/react";
import { StudentCard } from "@/components/dashboard/student-card";
import { AvatarImage } from "@/components/ui/avatar-template-picker";
import type { DemoActivity, DemoBehavior, DemoPraise, DemoStudent } from "@/lib/demo-data";
import { applyStudentAvatarUpdates } from "@/lib/client/student-avatar-store";

const activityIcons = {
  star: Star,
  message: ChatCircleText,
  task: CheckCircle,
};

const activityToneClasses = {
  gold: "bg-[#fff2bd] text-[#705d00]",
  orange: "bg-[#ffe0cf] text-[#974400]",
  blue: "bg-[#d4e3ff] text-[#005da7]",
};

const behaviorToneClasses = {
  gold: "bg-[#fff2bd] text-[#705d00]",
  coral: "bg-[#ffd5c7] text-[#974400]",
  blue: "bg-[#d4e3ff] text-[#005da7]",
  green: "bg-[#c9f5e5] text-[#136b54]",
};

export function DashboardScreen({
  teacherName,
  classId,
  className,
  students: initialStudents,
  activities,
  praiseItems,
  behaviors,
  stats,
  initialScoreStudentId,
}: {
  teacherName: string;
  classId: string;
  className: string;
  students: DemoStudent[];
  activities: DemoActivity[];
  praiseItems: DemoPraise[];
  behaviors: DemoBehavior[];
  stats: {
    totalLifetimeScore: number;
    todayScore: number;
    studentCount: number;
    recentActivityCount: number;
  };
  initialScoreStudentId?: string;
}) {
  const router = useRouter();
  const [students, setStudents] = useState<DemoStudent[]>(initialStudents);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isScoreOpen, setIsScoreOpen] = useState(false);
  const [selectedBehaviorId, setSelectedBehaviorId] = useState(behaviors[0]?.id ?? "");
  const [toast, setToast] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialScoreOpened = useRef(false);

  useEffect(() => {
    startTransition(() => {
      setStudents(applyStudentAvatarUpdates(initialStudents));
    });
  }, [initialStudents]);

  useEffect(() => {
    function handleAvatarChanged(event: Event) {
      const detail = (event as CustomEvent<{ studentId?: string; url?: string }>).detail;
      if (!detail?.studentId || typeof detail.url !== "string") return;

      setStudents((current) => current.map((student) => (
        student.id === detail.studentId ? { ...student, avatarUrl: detail.url } : student
      )));
    }

    window.addEventListener("phudong:student-avatar-changed", handleAvatarChanged);
    return () => window.removeEventListener("phudong:student-avatar-changed", handleAvatarChanged);
  }, []);

  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.includes(student.id)),
    [selectedStudentIds, students],
  );

  useEffect(() => {
    if (!isScoreOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsScoreOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isScoreOpen]);

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timeout = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (
      initialScoreOpened.current ||
      !initialScoreStudentId ||
      !students.some((student) => student.id === initialScoreStudentId)
    ) {
      return;
    }
    initialScoreOpened.current = true;
    setSelectedStudentIds([initialScoreStudentId]);
    setSelectedBehaviorId(behaviors.find((behavior) => behavior.points > 0)?.id ?? "");
    setIsScoreOpen(true);
  }, [behaviors, initialScoreStudentId, students]);

  function openScore(studentIds: string[], direction: "positive" | "needs-improvement" = "positive") {
    setSelectedStudentIds(studentIds);
    setSelectedBehaviorId(
      behaviors.find((behavior) => (direction === "positive" ? behavior.points > 0 : behavior.points < 0))?.id ?? "",
    );
    setIsScoreOpen(true);
  }

  async function applyScore() {
    const behavior = behaviors.find((item) => item.id === selectedBehaviorId);
    if (!behavior || selectedStudentIds.length === 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/teacher/score", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "idempotency-key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          classId,
          studentIds: selectedStudentIds,
          behaviorTemplateId: behavior.id,
          reason: behavior.label,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error || "Không thể lưu ghi nhận.");
      }

      setIsScoreOpen(false);
      setToast(behavior.points < 0 ? "Đã ghi nhận điều cần cải thiện." : "Đã lưu ghi nhận tích cực.");
      router.refresh();
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Không thể lưu ghi nhận.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Lớp học hôm nay</p>
            <h1 className="mt-2 font-heading text-4xl font-bold leading-tight tracking-[-0.03em] text-[var(--primary)] sm:text-5xl">
              Chào buổi sáng, {teacherName}!
            </h1>
            <p className="mt-3 font-body text-base text-[var(--on-surface-variant)]">
              Đây là những gì đang diễn ra ở {className}.
            </p>
          </div>
          <Link href="/teacher/students" className="inline-flex min-h-12 items-center justify-center gap-2 self-start rounded-full bg-[var(--secondary-container)] px-5 font-heading text-sm font-bold text-[var(--secondary)] shadow-md shadow-yellow-900/10 transition hover:bg-[#ffe16d] active:scale-[0.98] sm:self-auto">
            <CalendarCheck size={20} weight="bold" /> Mở danh sách hôm nay
          </Link>
        </div>

        <section aria-labelledby="today-heading">
          <div className="mb-4 flex items-center gap-2">
            <CalendarCheck size={24} weight="fill" className="text-[var(--primary)]" />
            <h2 id="today-heading" className="font-heading text-2xl font-bold text-[var(--on-surface)]">Hôm nay</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
              <Star size={110} weight="fill" className="absolute -right-5 -top-8 text-[var(--secondary-container)] opacity-20" />
              <p className="relative font-heading text-xs font-bold uppercase tracking-wide text-[var(--on-surface-variant)]">Tổng sao tích cực</p>
              <div className="relative mt-5 flex items-end gap-2">
                <span className="font-heading text-5xl font-bold text-[var(--secondary-container)]">{stats.totalLifetimeScore}</span>
                <span className="mb-1 font-heading text-sm font-bold text-[var(--primary)]">{stats.todayScore >= 0 ? "+" : ""}{stats.todayScore} hôm nay</span>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
              <div className="flex items-start justify-between gap-3">
                <p className="font-heading text-xs font-bold uppercase tracking-wide text-[var(--on-surface-variant)]">Sĩ số đang quản lý</p>
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-low)] px-3 py-1 font-heading text-xs font-bold text-[var(--primary)]">
                  <CheckCircle size={15} weight="fill" /> {stats.studentCount} bạn
                </span>
              </div>
              <div className="mt-7">
                <div className="mb-2 flex justify-between font-body text-sm">
                  <span className="text-[var(--on-surface)]">Danh sách đang hoạt động</span>
                  <span className="text-[var(--primary)]">100%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-[var(--surface-variant)]">
                  <div className="h-full w-full rounded-full bg-[var(--primary)]" />
                </div>
              </div>
            </div>
            <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
              <p className="font-heading text-xs font-bold uppercase tracking-wide text-[var(--on-surface-variant)]">Hoạt động của lớp</p>
              <div className="mt-5 flex items-center gap-3">
                <div className="flex -space-x-2">
                  {students.slice(0, 4).map((student) => (
                    <span key={student.id} className={"flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-white font-heading text-xs font-bold " + behaviorToneClasses[student.tone === "lilac" ? "blue" : student.tone]}>
                      {student.avatarUrl ? <AvatarImage src={student.avatarUrl} alt="" size={44} className="h-full w-full rounded-full" /> : student.shortName}
                    </span>
                  ))}
                </div>
                <div>
                  <p className="font-heading text-2xl font-bold text-[var(--primary)]">{stats.recentActivityCount}</p>
                  <p className="font-body text-xs text-[var(--on-surface-variant)]">ghi nhận gần đây</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section aria-labelledby="activity-heading">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="activity-heading" className="font-heading text-2xl font-bold text-[var(--on-surface)]">Hoạt động gần đây</h2>
              <Link href={`/teacher/analytics?classId=${classId}`} className="font-heading text-sm font-bold text-[var(--primary)] transition hover:underline">Xem tất cả</Link>
            </div>
            <div className="overflow-hidden rounded-[1.5rem] bg-[var(--surface-lowest)] soft-shadow">
              {activities.length > 0 ? activities.map((activity) => {
                const Icon = activityIcons[activity.type];
                return (
                  <div key={activity.id} className="flex items-center gap-4 border-b border-[var(--surface-high)] p-5 last:border-b-0">
                    <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-full " + activityToneClasses[activity.tone]}>
                      <Icon size={22} weight="fill" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-body text-base text-[var(--on-surface)]">{activity.title}</p>
                      <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">{activity.detail}</p>
                    </div>
                    <span className="hidden shrink-0 font-body text-xs text-[var(--on-surface-variant)] sm:block">{activity.time}</span>
                  </div>
                );
              }) : (
                <p className="p-6 font-body text-sm text-[var(--on-surface-variant)]">Chưa có ghi nhận nào trong lớp.</p>
              )}
            </div>
          </section>

          <section aria-labelledby="praise-heading" className="rounded-[1.5rem] border-2 border-[var(--primary-fixed)] bg-[var(--surface-low)] p-5">
            <div className="mb-5 flex items-center justify-between">
              <h2 id="praise-heading" className="flex items-center gap-2 font-heading text-2xl font-bold text-[var(--primary)]">
                <Sparkle size={24} weight="fill" /> Tuyên dương nhanh
              </h2>
              <Link href={`/teacher/praise?classId=${classId}`} aria-label="Tạo bài tuyên dương" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-lowest)] text-[var(--primary)] shadow-sm transition hover:bg-white active:scale-95">
                <Plus size={21} weight="bold" />
              </Link>
            </div>
            <div className="space-y-4">
              {praiseItems.map((item) => (
                <article key={item.id} className="rounded-2xl bg-[var(--surface-lowest)] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-heading text-sm font-bold " + (item.tone === "gold" ? "bg-[#fff2bd] text-[#705d00]" : item.tone === "blue" ? "bg-[#d4e3ff] text-[#005da7]" : "bg-[#c9f5e5] text-[#136b54]")}>
                      {item.student.charAt(0)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-heading text-sm font-bold text-[var(--on-surface)]">{item.student} <span className="font-body font-normal text-[var(--on-surface-variant)]">{item.time}</span></p>
                      <span className="mt-1 inline-flex rounded-full bg-[var(--surface-low)] px-2 py-1 font-heading text-[11px] font-bold text-[var(--primary)]">{item.behavior}</span>
                      {item.body ? <p className="mt-3 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{item.body}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section aria-labelledby="students-heading" className="mt-10">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <h2 id="students-heading" className="font-heading text-2xl font-bold text-[var(--on-surface)]">Học sinh trong lớp</h2>
              <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Chạm vào nút cộng để ghi nhận nhanh, hoặc mở hồ sơ để xem chi tiết.</p>
            </div>
            <Link href="/teacher/students" className="inline-flex items-center gap-1 font-heading text-sm font-bold text-[var(--primary)] hover:underline">
              Quản lý danh sách <ArrowRight size={17} weight="bold" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {students.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
                classId={classId}
                onScore={(studentId) => openScore([studentId])}
                onOpen={(studentId) => {
                  router.push("/teacher/students/" + studentId);
                }}
              />
            ))}
          </div>
        </section>
      </div>

      <button
        type="button"
        onClick={() => openScore(students.map((student) => student.id))}
        aria-label="Cộng điểm cho nhiều học sinh"
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-xl shadow-blue-900/20 transition hover:bg-[var(--primary-container)] active:scale-95 md:bottom-8 md:right-8"
      >
        <Plus size={28} weight="bold" />
      </button>

      {toast ? (
        <div role="status" className="fixed bottom-24 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[var(--on-surface)] px-5 py-3 font-heading text-sm font-bold text-[var(--surface-lowest)] shadow-xl md:bottom-8">
          <Check size={18} weight="bold" className="text-[var(--positive)]" /> {toast}
        </div>
      ) : null}

      {isScoreOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--on-surface)]/35 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setIsScoreOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="score-dialog-title" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[2rem] bg-[var(--surface-lowest)] p-5 shadow-2xl sm:rounded-[2rem] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Ghi nhận trong lớp</p>
                <h2 id="score-dialog-title" className="mt-2 font-heading text-2xl font-bold text-[var(--on-surface)]">Chọn hành vi</h2>
                <p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">
                  {selectedStudents.length > 0 ? selectedStudents.map((student) => student.name).join(", ") : "Nhiều học sinh"}
                </p>
              </div>
              <button type="button" onClick={() => setIsScoreOpen(false)} aria-label="Đóng" className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-low)] text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)] active:scale-95">
                <X size={20} />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {behaviors.map((behavior) => {
                const selected = selectedBehaviorId === behavior.id;
                return (
                  <button
                    key={behavior.id}
                    type="button"
                    onClick={() => setSelectedBehaviorId(behavior.id)}
                    className={"min-h-32 rounded-2xl border-2 p-4 text-left transition active:scale-[0.98] " + (selected ? "border-[var(--primary)] bg-[var(--surface-low)]" : "border-transparent bg-[var(--surface-low)] hover:border-[var(--primary-fixed)]")}
                  >
                    <span className={"flex h-10 w-10 items-center justify-center rounded-full " + behaviorToneClasses[behavior.tone]}>
                      {behavior.points > 0 ? <Star size={21} weight="fill" /> : <Clock size={21} />}
                    </span>
                    <span className="mt-3 block font-heading text-sm font-bold text-[var(--on-surface)]">{behavior.label}</span>
                    <span className={"mt-1 block font-heading text-sm font-bold " + (behavior.points > 0 ? "text-[var(--positive)]" : "text-[var(--needs-improvement)]")}>
                      {behavior.points > 0 ? "+" : ""}{behavior.points} sao
                    </span>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={applyScore} disabled={isSubmitting || behaviors.length === 0} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white shadow-md shadow-blue-900/10 transition hover:bg-[var(--primary-container)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
              <CheckCircle size={20} weight="fill" /> {isSubmitting ? "Đang lưu..." : behaviors.length === 0 ? "Chưa có hành vi" : "Lưu ghi nhận"}
            </button>
          </section>
        </div>
      ) : null}
    </>
  );
}
