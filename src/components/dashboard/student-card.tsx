"use client";

import { ArrowUpRight, CheckCircle, Minus, Plus, Star } from "@phosphor-icons/react";
import type { DemoStudent } from "@/lib/demo-data";
import { StudentAvatarPicker } from "@/components/ui/avatar-template-picker";

const toneClasses: Record<DemoStudent["tone"], string> = {
  gold: "bg-[#ffe68a] text-[#705d00]",
  coral: "bg-[#ffd5c7] text-[#974400]",
  blue: "bg-[#d4e3ff] text-[#005da7]",
  green: "bg-[#c9f5e5] text-[#136b54]",
  lilac: "bg-[#eadcff] text-[#68449a]",
};

export function StudentCard({
  student,
  classId,
  onScore,
  onOpen,
}: {
  student: DemoStudent;
  classId: string | null;
  onScore: (studentId: string, direction: "positive" | "needs-improvement") => void;
  onOpen?: (studentId: string) => void;
}) {
  return (
    <article className="soft-shadow-hover rounded-[1.5rem] border border-white/80 bg-[var(--surface-lowest)] p-4 soft-shadow">
      <div className="flex items-start gap-3">
        {classId ? (
          <StudentAvatarPicker
            classId={classId}
            studentId={student.id}
            value={student.avatarUrl}
            gender={student.gender === "male" || student.gender === "female" ? student.gender : null}
            fallback={<span className={"flex h-16 w-16 items-center justify-center rounded-[1.25rem] font-heading text-lg font-bold " + toneClasses[student.tone]}>{student.shortName}</span>}
          />
        ) : (
          <button
            type="button"
            onClick={() => onOpen?.(student.id)}
            className={"flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-bold transition hover:-translate-y-0.5 hover:shadow-md active:scale-95 " + toneClasses[student.tone]}
            aria-label={"Mở hồ sơ " + student.name}
          >
            {student.shortName}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => onOpen?.(student.id)} className="text-left">
            <p className="truncate font-heading text-base font-bold text-[var(--on-surface)]">{student.name}</p>
            <p className="mt-0.5 truncate font-body text-xs text-[var(--on-surface-variant)]">{student.group}{student.classRole ? ` · ${student.classRole}` : ""}</p>
            {student.guardians?.length ? <p className="mt-1 truncate font-body text-[11px] text-[var(--outline)]">PH: {student.guardians.map((guardian) => guardian.fullName).join(" · ")}</p> : null}
          </button>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--secondary-container)]/30 px-2 py-1 font-heading text-[11px] font-bold text-[var(--secondary)]">
              <Star size={13} weight="fill" /> {student.spendableStars}
            </span>
            <span className="rounded-full bg-[var(--surface-low)] px-2 py-1 font-heading text-[11px] font-bold text-[var(--primary)]">
              Level {student.level}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onOpen?.(student.id)}
          aria-label={"Xem chi tiết " + student.name}
          className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition hover:bg-[var(--surface-container)] hover:text-[var(--primary)]"
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-body text-xs text-[var(--on-surface-variant)]">{student.levelLabel}</span>
          <span className="font-heading text-sm font-bold text-[var(--primary)]">{student.points} điểm</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[var(--primary-fixed)]/60">
          <div className="h-full rounded-full bg-[var(--positive)] transition-[width] duration-300" style={{ width: student.progress + "%" }} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--surface-high)] pt-3">
        <span className={"inline-flex items-center gap-1.5 font-heading text-xs font-bold " + (student.taskStatus === "Đã xong" ? "text-[var(--positive)]" : student.taskStatus === "Đang làm" ? "text-[var(--tertiary)]" : "text-[var(--on-surface-variant)]")}>
          <CheckCircle size={15} weight={student.taskStatus === "Đã xong" ? "fill" : "regular"} />
          {student.taskStatus}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onScore(student.id, "needs-improvement")}
            aria-label={"Ghi nhận cần cải thiện cho " + student.name}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--needs-improvement-soft)] text-[var(--needs-improvement)] transition hover:bg-[var(--needs-improvement-soft)] active:scale-95"
          >
            <Minus size={17} weight="bold" />
          </button>
          <button
            type="button"
            onClick={() => onScore(student.id, "positive")}
            aria-label={"Cộng điểm cho " + student.name}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary)] text-white transition hover:bg-[var(--primary-container)] active:scale-95"
          >
            <Plus size={17} weight="bold" />
          </button>
        </div>
      </div>
    </article>
  );
}
