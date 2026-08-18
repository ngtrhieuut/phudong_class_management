"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type StudentDraft = { studentCode: string; fullName: string; gender: "male" | "female" | "other" | "undisclosed" };

export function TeacherOnboardingForm({ initialOrganizationName }: { initialOrganizationName: string }) {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState(initialOrganizationName);
  const [organizationCode, setOrganizationCode] = useState("");
  const [schoolYearName, setSchoolYearName] = useState("2026-2027");
  const [startsAt, setStartsAt] = useState("2026-08-01");
  const [endsAt, setEndsAt] = useState("2027-05-31");
  const [className, setClassName] = useState("Lớp 1/6");
  const [grade, setGrade] = useState("1");
  const [studentsText, setStudentsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function parseStudents(): StudentDraft[] {
    return studentsText.split("\n").map((line) => line.trim()).filter(Boolean).map((line, index) => {
      const [studentCode, fullName, gender = "undisclosed"] = line.split(",").map((part) => part.trim());
      return { studentCode: studentCode || `HS-${String(index + 1).padStart(3, "0")}`, fullName: fullName || studentCode || `Học sinh ${index + 1}`, gender: ["male", "female", "other", "undisclosed"].includes(gender) ? gender as StudentDraft["gender"] : "undisclosed" };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/teacher/onboarding", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ organization: { name: organizationName, code: organizationCode || undefined }, schoolYear: { name: schoolYearName, startsAt, endsAt }, classroom: { name: className, grade: Number(grade) }, students: parseStudents() }) });
      const payload = await response.json().catch(() => null) as { error?: string; data?: { classId?: string } } | null;
      if (!response.ok || !payload?.data?.classId) throw new Error(payload?.error || "Không thể khởi tạo lớp.");
      router.replace(`/teacher/dashboard?classId=${encodeURIComponent(payload.data.classId)}`);
      router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể khởi tạo lớp."); } finally { setBusy(false); }
  }

  return <main className="min-h-[100dvh] bg-[var(--surface)] px-5 py-8 sm:px-8"><div className="mx-auto max-w-3xl"><p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Thiết lập lần đầu</p><h1 className="mt-2 font-heading text-4xl font-bold text-[var(--primary)]">Khởi tạo lớp học</h1><p className="mt-3 max-w-2xl font-body leading-7 text-[var(--on-surface-variant)]">Các bước được thực hiện trong một transaction và có thể gửi lại an toàn. Bạn có thể bổ sung học sinh sau trong mục quản lý học sinh.</p><form onSubmit={submit} className="mt-8 space-y-6"><section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><h2 className="font-heading text-xl font-bold">1. Tổ chức</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="font-heading text-xs font-bold">Tên trường/tổ chức</span><input required value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label><label><span className="font-heading text-xs font-bold">Mã tổ chức (tùy chọn)</span><input value={organizationCode} onChange={(event) => setOrganizationCode(event.target.value)} placeholder="TRUONG-01" className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label></div></section><section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><h2 className="font-heading text-xl font-bold">2. Năm học và lớp</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="font-heading text-xs font-bold">Tên năm học</span><input required value={schoolYearName} onChange={(event) => setSchoolYearName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label><label><span className="font-heading text-xs font-bold">Khối</span><input required type="number" min="1" max="12" value={grade} onChange={(event) => setGrade(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label><label><span className="font-heading text-xs font-bold">Bắt đầu</span><input required type="date" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label><label><span className="font-heading text-xs font-bold">Kết thúc</span><input required type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label><label className="sm:col-span-2"><span className="font-heading text-xs font-bold">Tên lớp</span><input required value={className} onChange={(event) => setClassName(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label></div></section><section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow"><h2 className="font-heading text-xl font-bold">3. Học sinh (tùy chọn)</h2><p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Mỗi dòng: <code>mã, họ tên, gender</code>. gender là male/female/other/undisclosed.</p><textarea value={studentsText} onChange={(event) => setStudentsText(event.target.value)} rows={7} placeholder="HS001, Nguyễn Minh An, male" className="mt-4 w-full rounded-xl bg-[var(--surface-low)] p-3 font-body text-sm" /></section><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><button type="submit" disabled={busy} className="min-h-12 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white disabled:opacity-50">{busy ? "Đang thiết lập..." : "Hoàn tất khởi tạo"}</button><a href="/teacher/dashboard" className="font-heading text-sm font-bold text-[var(--on-surface-variant)]">Để sau</a>{message ? <p role="alert" className="font-body text-sm text-[var(--needs-improvement)]">{message}</p> : null}</div></form></div></main>;
}
