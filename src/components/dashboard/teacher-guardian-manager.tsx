"use client";

import { useMemo, useState } from "react";
import { LinkSimple, ShieldCheck, UserMinus, UserPlus, UsersThree } from "@phosphor-icons/react";

type Student = { id: string; fullName: string; studentCode: string };
type GuardianRelation = {
  relationId: string;
  studentId: string;
  guardianName: string;
  guardianEmail: string | null;
  guardianUserStatus: "active" | "invited" | "suspended" | "archived" | null;
  relationship: string;
  canView: boolean;
  receivesNotifications: boolean;
};

const relationshipOptions = ["Bố", "Mẹ", "Ông", "Bà", "Người giám hộ"];

export function TeacherGuardianManager({
  classId,
  students,
  initialRelations,
}: {
  classId: string;
  students: Student[];
  initialRelations: GuardianRelation[];
}) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [guardianEmail, setGuardianEmail] = useState("");
  const [relationship, setRelationship] = useState("Mẹ");
  const [relations, setRelations] = useState(initialRelations);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const relationByStudent = useMemo(() => {
    const grouped = new Map<string, GuardianRelation[]>();
    for (const relation of relations) grouped.set(relation.studentId, [...(grouped.get(relation.studentId) ?? []), relation]);
    return grouped;
  }, [relations]);

  async function link() {
    if (!studentId || !guardianEmail.trim() || !relationship.trim()) {
      setMessage("Chọn học sinh và nhập email, mối quan hệ của phụ huynh.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/teacher/guardians", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId, studentId, guardianEmail, relationship, canView: true, receivesNotifications: true }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể liên kết phụ huynh.");
      setGuardianEmail("");
      setMessage("Đã liên kết phụ huynh. Danh sách sẽ được cập nhật.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể liên kết phụ huynh.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(relation: GuardianRelation) {
    if (!window.confirm(`Thu hồi quyền xem của ${relation.guardianName}?`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/teacher/guardians/${relation.studentId}/${relation.relationId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể thu hồi liên kết.");
      setRelations((current) => current.map((item) => item.relationId === relation.relationId ? { ...item, canView: false, receivesNotifications: false } : item));
      setMessage("Đã thu hồi quyền xem và thông báo.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể thu hồi liên kết.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
        <div className="flex items-center gap-2">
          <UserPlus size={24} className="text-[var(--primary)]" weight="fill" />
          <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Thêm liên kết</h2>
        </div>
        <p className="mt-2 font-body text-sm leading-6 text-[var(--on-surface-variant)]">Nhập email tài khoản phụ huynh đã đăng nhập vào Phù Đổng ít nhất một lần.</p>
        {students.length > 0 ? (
          <>
            <label className="mt-5 block">
              <span className="font-heading text-sm font-bold text-[var(--on-surface)]">Học sinh</span>
              <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-4 font-body">
                {students.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.studentCode}</option>)}
              </select>
            </label>
            <label className="mt-4 block">
              <span className="font-heading text-sm font-bold text-[var(--on-surface)]">Email phụ huynh</span>
              <input type="email" value={guardianEmail} onChange={(event) => setGuardianEmail(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body outline-none focus:border-[var(--primary-fixed)]" placeholder="phuhuynh@example.com" autoComplete="email" />
            </label>
            <label className="mt-4 block">
              <span className="font-heading text-sm font-bold text-[var(--on-surface)]">Mối quan hệ</span>
              <input list="guardian-relationships" value={relationship} onChange={(event) => setRelationship(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border-2 border-transparent bg-[var(--surface-low)] px-4 font-body outline-none focus:border-[var(--primary-fixed)]" placeholder="Ví dụ: Mẹ" />
              <datalist id="guardian-relationships">{relationshipOptions.map((option) => <option key={option} value={option} />)}</datalist>
            </label>
            <button type="button" disabled={busy} onClick={() => void link()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white disabled:opacity-50"><LinkSimple size={19} weight="bold" /> {busy ? "Đang lưu..." : "Liên kết phụ huynh"}</button>
          </>
        ) : (
          <div className="mt-5 rounded-2xl bg-[var(--surface-low)] p-4 font-body text-sm text-[var(--on-surface-variant)]">Chưa có học sinh đang hoạt động trong lớp.</div>
        )}
        <div className="mt-5 flex gap-3 rounded-2xl bg-[var(--primary-fixed)]/50 p-4">
          <ShieldCheck size={22} className="mt-0.5 shrink-0 text-[var(--primary)]" weight="fill" />
          <p className="font-body text-xs leading-5 text-[var(--on-surface-variant)]">Thu hồi liên kết sẽ tắt cả quyền xem dữ liệu và thông báo. Hệ thống vẫn giữ audit log để truy vết.</p>
        </div>
        {message ? <p role="status" className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Phạm vi truy cập</p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-[var(--on-surface)]">Danh sách liên kết</h2>
          </div>
          <span className="rounded-full bg-[var(--surface-low)] px-3 py-1 font-heading text-xs font-bold text-[var(--primary)]">{relations.filter((relation) => relation.canView).length} đang hoạt động</span>
        </div>
        <div className="space-y-4">
          {students.map((student) => {
            const studentRelations = relationByStudent.get(student.id) ?? [];
            return (
              <article key={student.id} className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-heading text-lg font-bold text-[var(--on-surface)]">{student.fullName}</h3>
                    <p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">Mã học sinh: {student.studentCode}</p>
                  </div>
                  <UsersThree size={22} className="text-[var(--primary)]" weight="fill" />
                </div>
                <div className="mt-4 space-y-3">
                  {studentRelations.map((relation) => (
                    <div key={relation.relationId} className="rounded-2xl bg-[var(--surface-low)] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate font-heading text-sm font-bold text-[var(--on-surface)]">{relation.guardianName}</p>
                          <p className="mt-1 truncate font-body text-xs text-[var(--on-surface-variant)]">{relation.guardianEmail || "Chưa có email"} · {relation.relationship}</p>
                          <div className="mt-2 flex flex-wrap gap-2 font-heading text-[11px] font-bold">
                            <span className={`rounded-full px-2.5 py-1 ${relation.canView ? "bg-[var(--positive-container)] text-[var(--positive)]" : "bg-[var(--surface-high)] text-[var(--on-surface-variant)]"}`}>{relation.canView ? "Được xem" : "Đã thu hồi"}</span>
                            {relation.canView && relation.receivesNotifications ? <span className="rounded-full bg-[var(--secondary-container)]/60 px-2.5 py-1 text-[var(--secondary)]">Nhận thông báo</span> : null}
                            {relation.guardianUserStatus && relation.guardianUserStatus !== "active" ? <span className="rounded-full bg-[var(--surface-high)] px-2.5 py-1 text-[var(--on-surface-variant)]">Tài khoản {relation.guardianUserStatus}</span> : null}
                          </div>
                        </div>
                        {relation.canView ? <button type="button" disabled={busy} onClick={() => void revoke(relation)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full border border-[var(--outline-variant)] px-3 font-heading text-xs font-bold text-[var(--primary)] disabled:opacity-50"><UserMinus size={16} /> Thu hồi</button> : null}
                      </div>
                    </div>
                  ))}
                  {studentRelations.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--outline-variant)] p-4 font-body text-sm text-[var(--on-surface-variant)]">Chưa liên kết phụ huynh.</p> : null}
                </div>
              </article>
            );
          })}
          {students.length === 0 ? <div className="rounded-[1.5rem] border border-dashed border-[var(--outline-variant)] bg-[var(--surface-lowest)] p-12 text-center"><UsersThree size={38} className="mx-auto text-[var(--outline)]" /><p className="mt-3 font-body text-sm text-[var(--on-surface-variant)]">Chưa có dữ liệu học sinh.</p></div> : null}
        </div>
      </section>
    </div>
  );
}
