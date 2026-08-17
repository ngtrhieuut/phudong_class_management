"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Archive, FloppyDisk } from "@phosphor-icons/react";

type StudentGender = "male" | "female" | "other" | "undisclosed";

export function StudentEditForm({
  classId,
  studentId,
  initial,
}: {
  classId: string;
  studentId: string;
  initial: { studentCode: string; fullName: string; birthDate: string | null; gender: StudentGender | null; seatNo: number | null; groupName: string | null };
}) {
  const router = useRouter();
  const [studentCode, setStudentCode] = useState(initial.studentCode);
  const [fullName, setFullName] = useState(initial.fullName);
  const [birthDate, setBirthDate] = useState(initial.birthDate ?? "");
  const [gender, setGender] = useState<StudentGender>(initial.gender ?? "undisclosed");
  const [seatNo, setSeatNo] = useState(initial.seatNo ? String(initial.seatNo) : "");
  const [groupName, setGroupName] = useState(initial.groupName ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teacher/students/${studentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, studentCode, fullName, birthDate: birthDate || null, gender, seatNo: seatNo ? Number(seatNo) : null, groupName: groupName || null }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể cập nhật học sinh.");
      setMessage("Đã lưu thay đổi.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật học sinh.");
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!window.confirm("Lưu trữ học sinh khỏi lớp này? Dữ liệu lịch sử sẽ vẫn được giữ lại.")) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teacher/students/${studentId}?classId=${encodeURIComponent(classId)}`, { method: "DELETE" });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể lưu trữ học sinh.");
      router.push(`/teacher/students?classId=${encodeURIComponent(classId)}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu trữ học sinh.");
      setBusy(false);
    }
  }

  return <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Chỉnh sửa hồ sơ</h2><p className="mt-1 font-body text-sm text-[var(--on-surface-variant)]">Thay đổi thông tin lớp học, không xoá lịch sử điểm.</p></div><button type="button" onClick={() => void archive()} disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[var(--needs-improvement-soft)] px-3 font-heading text-xs font-bold text-[var(--needs-improvement)] disabled:opacity-50"><Archive size={16} /> Lưu trữ</button></div><form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={save}><label><span className="font-heading text-xs font-bold">Mã học sinh</span><input required value={studentCode} onChange={(event) => setStudentCode(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label><label><span className="font-heading text-xs font-bold">Họ và tên</span><input required value={fullName} onChange={(event) => setFullName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label><label><span className="font-heading text-xs font-bold">Ngày sinh</span><input type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label><label><span className="font-heading text-xs font-bold">Giới tính</span><select value={gender} onChange={(event) => setGender(event.target.value as StudentGender)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm"><option value="undisclosed">Chưa khai báo</option><option value="male">Nam</option><option value="female">Nữ</option><option value="other">Khác</option></select></label><label><span className="font-heading text-xs font-bold">Số thứ tự</span><input type="number" min="1" max="200" value={seatNo} onChange={(event) => setSeatNo(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label><label><span className="font-heading text-xs font-bold">Tổ</span><input value={groupName} onChange={(event) => setGroupName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3 font-body text-sm" /></label><div className="sm:col-span-2 flex items-center gap-3"><button type="submit" disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white disabled:opacity-50"><FloppyDisk size={18} /> {busy ? "Đang lưu..." : "Lưu hồ sơ"}</button>{message ? <p role="status" className="font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}</div></form></section>;
}
