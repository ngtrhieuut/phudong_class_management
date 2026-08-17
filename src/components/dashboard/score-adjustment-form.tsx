"use client";

import { FormEvent, useState } from "react";
import { ArrowClockwise, CheckCircle, Wrench } from "@phosphor-icons/react";

type SourceTransaction = {
  id: string;
  reason: string;
  lifetimeDelta: number;
  spendableDelta: number;
  occurredAt: string;
};

export function ScoreAdjustmentForm({
  classId,
  studentId,
  sourceTransactions,
}: {
  classId: string;
  studentId: string;
  sourceTransactions: SourceTransaction[];
}) {
  const [sourceTransactionId, setSourceTransactionId] = useState(sourceTransactions[0]?.id ?? "");
  const [lifetimeDelta, setLifetimeDelta] = useState("0");
  const [spendableDelta, setSpendableDelta] = useState("0");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const lifetime = Number(lifetimeDelta);
    const spendable = Number(spendableDelta);
    if (!sourceTransactionId || !reason.trim() || (!lifetime && !spendable)) {
      setMessage({ type: "error", text: "Chọn giao dịch gốc, nhập lý do và thay đổi ít nhất một loại điểm." });
      return;
    }

    setPending(true);
    try {
      const response = await fetch("/api/teacher/score/adjust", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({
          classId,
          studentId,
          sourceTransactionId,
          lifetimeDelta: lifetime,
          spendableDelta: spendable,
          reason: reason.trim(),
          note: note.trim() || undefined,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Không thể lưu điều chỉnh.");
      }
      setReason("");
      setNote("");
      setLifetimeDelta("0");
      setSpendableDelta("0");
      setMessage({ type: "success", text: "Đã thêm điều chỉnh vào sổ điểm và nhật ký kiểm toán." });
      window.location.reload();
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Không thể lưu điều chỉnh." });
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-[var(--primary)]"><Wrench size={20} weight="bold" /></span>
        <div><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Điều chỉnh điểm</h2><p className="mt-1 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Ghi thêm một dòng điều chỉnh, không sửa hoặc xoá giao dịch gốc.</p></div>
      </div>
      {sourceTransactions.length === 0 ? <p className="mt-5 rounded-2xl bg-[var(--surface-low)] p-4 font-body text-sm text-[var(--on-surface-variant)]">Chưa có giao dịch gốc để điều chỉnh.</p> : <form className="mt-5 space-y-4" onSubmit={submit}>
        <label className="block"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Giao dịch gốc</span><select value={sourceTransactionId} onChange={(event) => setSourceTransactionId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]"><option value="">Chọn giao dịch</option>{sourceTransactions.map((item) => <option key={item.id} value={item.id}>{new Date(item.occurredAt).toLocaleDateString("vi-VN")} · {item.reason} ({item.spendableDelta > 0 ? "+" : ""}{item.spendableDelta} sao)</option>)}</select></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Lifetime delta</span><input type="number" step="1" value={lifetimeDelta} onChange={(event) => setLifetimeDelta(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]" /></label><label className="block"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Sao có thể đổi</span><input type="number" step="1" value={spendableDelta} onChange={(event) => setSpendableDelta(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]" /></label></div>
        <label className="block"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Lý do bắt buộc</span><input required value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="Ví dụ: hoàn lại điểm do ghi nhận nhầm" className="mt-2 min-h-11 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 font-body text-sm text-[var(--on-surface)]" /></label>
        <label className="block"><span className="font-heading text-xs font-bold text-[var(--on-surface)]">Ghi chú (tuỳ chọn)</span><textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} rows={2} className="mt-2 w-full rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-low)] px-3 py-3 font-body text-sm text-[var(--on-surface)]" /></label>
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{pending ? <ArrowClockwise size={18} className="animate-spin" /> : <Wrench size={18} />} {pending ? "Đang lưu..." : "Thêm điều chỉnh"}</button>
      </form>}
      {message ? <p role="status" className={`mt-4 flex items-start gap-2 rounded-2xl p-3 font-body text-sm ${message.type === "success" ? "bg-[var(--positive-soft)] text-[var(--positive)]" : "bg-[var(--needs-improvement-soft)] text-[var(--needs-improvement)]"}`}>{message.type === "success" ? <CheckCircle size={18} weight="fill" /> : null}{message.text}</p> : null}
    </section>
  );
}
