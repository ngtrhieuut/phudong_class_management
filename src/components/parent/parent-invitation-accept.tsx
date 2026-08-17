"use client";

import { useState } from "react";
import { CheckCircle, SpinnerGap } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";

export function ParentInvitationAccept({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/parent/guardians/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const payload = await response.json().catch(() => null) as { data?: { studentId?: string }; error?: string } | null;
      if (!response.ok || !payload?.data?.studentId) throw new Error(payload?.error || "Không thể nhận lời mời.");
      router.replace(`/parent/today?studentId=${encodeURIComponent(payload.data.studentId)}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể nhận lời mời.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex gap-3 rounded-2xl bg-[var(--primary-fixed)]/50 p-4">
        <CheckCircle size={22} className="mt-0.5 shrink-0 text-[var(--primary)]" weight="fill" />
        <p className="font-body text-xs leading-5 text-[var(--on-surface-variant)]">Sau khi xác nhận, bạn chỉ nhìn thấy dữ liệu của học sinh được giáo viên liên kết với lời mời này.</p>
      </div>
      <button type="button" onClick={() => void accept()} disabled={busy} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white disabled:opacity-60">
        {busy ? <SpinnerGap size={20} className="animate-spin" /> : <CheckCircle size={20} weight="fill" />}
        {busy ? "Đang xác nhận..." : "Xác nhận kết nối"}
      </button>
      {error ? <p role="alert" className="mt-4 rounded-2xl bg-[var(--needs-improvement-soft)] px-4 py-3 font-body text-sm leading-5 text-[var(--needs-improvement)]">{error}</p> : null}
    </div>
  );
}
