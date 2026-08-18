"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminInviteMemberForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId,
          action: "member.invite",
          email: String(form.get("email") || ""),
          displayName: String(form.get("displayName") || "") || undefined,
          role: String(form.get("role") || "teacher"),
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể mời thành viên.");
      event.currentTarget.reset();
      setMessage("Đã thêm lời mời. Khi tài khoản đăng nhập, quyền sẽ được nhận tự động.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể mời thành viên.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
      <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Mời thành viên</h2>
      <p className="mt-2 font-body text-sm text-[var(--on-surface-variant)]">Email được lưu dưới dạng tài khoản chờ; người được mời sẽ nhận role khi đăng nhập đúng email.</p>
      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr_0.7fr_auto] sm:items-end">
        <label className="font-body text-sm"><span className="font-heading text-xs font-bold">Email</span><input name="email" type="email" required placeholder="giao.vien@example.com" className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label>
        <label className="font-body text-sm"><span className="font-heading text-xs font-bold">Tên hiển thị</span><input name="displayName" placeholder="Cô giáo Yên" className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label>
        <label className="font-body text-sm"><span className="font-heading text-xs font-bold">Role</span><select name="role" defaultValue="teacher" className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3"><option value="teacher">teacher</option><option value="staff">staff</option><option value="admin">admin</option></select></label>
        <button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[var(--primary)] px-5 font-heading text-xs font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Mời thành viên"}</button>
      </form>
      {message ? <p role="status" className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}
    </section>
  );
}
