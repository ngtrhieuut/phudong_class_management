"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { UserPlus } from "@phosphor-icons/react";

export function StudentCreateForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("undisclosed");
  const [seatNo, setSeatNo] = useState("");
  const [groupName, setGroupName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          studentCode,
          fullName,
          birthDate: birthDate || null,
          gender,
          seatNo: seatNo ? Number(seatNo) : null,
          groupName: groupName || null,
        }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể tạo học sinh.");
      setStudentCode("");
      setFullName("");
      setBirthDate("");
      setGender("undisclosed");
      setSeatNo("");
      setGroupName("");
      setMessage("Đã thêm học sinh vào lớp.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo học sinh.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary-fixed)] text-[var(--primary)]"><UserPlus size={20} weight="bold" /></span><div><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Thêm học sinh</h2><p className="font-body text-sm text-[var(--on-surface-variant)]">Tạo nhanh một hồ sơ mới trong lớp.</p></div></div>
      <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
        <label><span className="font-heading text-xs font-bold">Mã học sinh</span><input required value={studentCode} onChange={(event) => setStudentCode(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label>
        <label className="sm:col-span-2 lg:col-span-2"><span className="font-heading text-xs font-bold">Họ và tên</span><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label>
        <label><span className="font-heading text-xs font-bold">Ngày sinh</span><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label>
        <label><span className="font-heading text-xs font-bold">Giới tính</span><select value={gender} onChange={(event) => setGender(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm"><option value="undisclosed">Chưa khai báo</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label>
        <label><span className="font-heading text-xs font-bold">Số thứ tự</span><input type="number" min="1" max="200" value={seatNo} onChange={(event) => setSeatNo(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label>
        <label><span className="font-heading text-xs font-bold">Tổ</span><input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" placeholder="Ví dụ: Tổ 1" /></label>
        <div className="flex items-end gap-3 sm:col-span-2 lg:col-span-2"><button type="submit" disabled={busy} className="min-h-11 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang lưu..." : "Thêm học sinh"}</button>{message ? <p role="status" className="font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}</div>
      </form>
    </section>
  );
}
