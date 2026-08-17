"use client";

import { FormEvent, useState } from "react";
import { Medal } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

type BadgeOption = { id: string; name: string; description: string };

export function BadgeAwardForm({
  classId,
  studentId,
  definitions,
  awardedBadgeIds,
}: {
  classId: string;
  studentId: string;
  definitions: BadgeOption[];
  awardedBadgeIds: string[];
}) {
  const router = useRouter();
  const available = definitions.filter((badge) => !awardedBadgeIds.includes(badge.id));
  const [badgeId, setBadgeId] = useState(available[0]?.id ?? "");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!badgeId) {
      setMessage("Học sinh đã nhận các huy hiệu hiện có.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/badges/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, studentId, badgeId, reason: reason || null }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể trao huy hiệu.");
      setReason("");
      setMessage("Đã trao huy hiệu cho học sinh.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể trao huy hiệu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--secondary-container)] text-[var(--secondary)]"><Medal size={21} weight="fill" /></span>
        <div><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Trao huy hiệu</h2><p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Ghi nhận một cột mốc cụ thể và lưu lại lý do.</p></div>
      </div>
      {available.length > 0 ? (
        <form className="mt-5 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" onSubmit={submit}>
          <label><span className="font-heading text-xs font-bold">Huy hiệu</span><select value={badgeId} onChange={(event) => setBadgeId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm">{available.map((badge) => <option key={badge.id} value={badge.id}>{badge.name}</option>)}</select></label>
          <label><span className="font-heading text-xs font-bold">Lý do (tuỳ chọn)</span><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" placeholder="Ví dụ: Chủ động giúp bạn" /></label>
          <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Trao huy hiệu"}</button>
        </form>
      ) : <p className="mt-5 font-body text-sm text-[var(--on-surface-variant)]">Chưa có huy hiệu khả dụng hoặc học sinh đã nhận đủ huy hiệu.</p>}
      {message ? <p role="status" className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}
    </section>
  );
}
