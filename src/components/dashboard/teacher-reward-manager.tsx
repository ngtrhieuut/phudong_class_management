"use client";

import { useState } from "react";
import { Gift, Star } from "@phosphor-icons/react";

type Student = { id: string; name: string };
type Reward = { id: string; name: string; description: string; rewardType: string; costStars: number; stock: number | null; active: boolean };

export function TeacherRewardManager({ classId, students, rewards }: { classId: string; students: Student[]; rewards: Reward[] }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  async function redeem(rewardId: string) {
    if (!studentId) { setMessage("Chưa có học sinh để đổi quà."); return; }
    setBusy(true); setMessage(null);
    try { const response = await fetch("/api/teacher/rewards/redeem", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ classId, studentId, rewardId }) }); const payload = await response.json().catch(() => null) as { error?: string }; if (!response.ok) throw new Error(payload?.error || "Không thể đổi quà."); setMessage("Đã tạo yêu cầu đổi quà."); } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể đổi quà."); } finally { setBusy(false); }
  }
  return <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Kho quà lớp học</p><h2 className="mt-1 font-heading text-2xl font-bold text-[var(--primary)]">Đổi sao thành trải nghiệm</h2></div><label className="font-body text-sm"><span className="sr-only">Chọn học sinh</span><select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="min-h-11 rounded-full bg-[var(--surface-low)] px-4">{students.map((student) => <option key={student.id} value={student.id}>{student.name}</option>)}</select></label></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{rewards.map((reward) => <article key={reward.id} className="rounded-2xl bg-[var(--surface-low)] p-4"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Gift size={22} weight="fill" /></span><h3 className="mt-4 font-heading text-base font-bold text-[var(--on-surface)]">{reward.name}</h3><p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">{reward.description}</p><div className="mt-4 flex items-center justify-between gap-2"><span className="flex items-center gap-1 font-heading text-sm font-bold text-[var(--secondary)]"><Star size={15} weight="fill" /> {reward.costStars}</span><button type="button" disabled={busy || !reward.active || reward.stock === 0} onClick={() => void redeem(reward.id)} className="rounded-full bg-[var(--primary)] px-3 py-2 font-heading text-xs font-bold text-white disabled:opacity-40">Đổi quà</button></div></article>)}{rewards.length === 0 ? <p className="font-body text-sm text-[var(--on-surface-variant)]">Chưa có phần thưởng.</p> : null}</div>{message ? <p role="status" className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}</section>;
}
