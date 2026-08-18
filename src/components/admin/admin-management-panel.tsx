"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Organization = { id: string; name: string; code: string };
type SchoolYear = { id: string; name: string; startsAt: Date | string; endsAt: Date | string; active: boolean };
type AdminClass = {
  id: string;
  name: string;
  grade: number;
  schoolYearId: string;
  schoolYearName: string;
  homeroomTeacherId: string | null;
  settingsJson?: Record<string, unknown>;
};
type Member = { userId: string; displayName: string; email: string | null; status: "active" | "invited" | "suspended" | "archived"; role: "admin" | "teacher" | "staff"; organizationId: string };
type ClassAccess = { classId: string; userId: string; role: "homeroom_teacher" | "teacher" | "assistant" };

export function AdminManagementPanel({
  organization,
  schoolYears,
  classes,
  members,
  classAccess,
}: {
  organization: Organization;
  schoolYears: SchoolYear[];
  classes: AdminClass[];
  members: Member[];
  classAccess: ClassAccess[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orgName, setOrgName] = useState(organization.name);
  const [orgCode, setOrgCode] = useState(organization.code);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [editingClassId, setEditingClassId] = useState("");
  const [editClassName, setEditClassName] = useState("");
  const [editGrade, setEditGrade] = useState("1");
  const [editSchoolYearId, setEditSchoolYearId] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");

  const selectedClass = classes.find((item) => item.id === selectedClassId);
  const selectedClassAccess = classAccess.filter((item) => item.classId === selectedClassId);
  const teacherCandidates = members.filter((member) => member.status === "active" && (member.role === "teacher" || member.role === "admin"));

  async function execute(action: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ organizationId: organization.id, ...action }),
      });
      const payload = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(payload?.error || "Không thể cập nhật.");
      setMessage("Đã cập nhật. Dữ liệu đang được làm mới.");
      router.refresh();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể cập nhật.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await execute({ action: "organization.update", name: orgName, code: orgCode });
  }

  async function createSchoolYear(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await execute({
      action: "school-year.save",
      name: String(form.get("name") || ""),
      startsAt: String(form.get("startsAt") || ""),
      endsAt: String(form.get("endsAt") || ""),
      active: form.get("active") === "on",
    });
    if (saved) event.currentTarget.reset();
  }

  async function inviteMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await execute({
      action: "member.invite",
      email: String(form.get("email") || ""),
      displayName: String(form.get("displayName") || "") || undefined,
      role: String(form.get("role") || "teacher"),
    });
    if (saved) event.currentTarget.reset();
  }

  async function createClass(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await execute({
      action: "class.save",
      name: String(form.get("name") || ""),
      grade: Number(form.get("grade")),
      schoolYearId: String(form.get("schoolYearId") || ""),
      teacherId: String(form.get("teacherId") || "") || null,
      archived: false,
    });
    if (saved) event.currentTarget.reset();
  }

  function startEditingClass(item: AdminClass) {
    setSelectedClassId(item.id);
    setEditingClassId(item.id);
    setEditClassName(item.name);
    setEditGrade(String(item.grade));
    setEditSchoolYearId(item.schoolYearId);
    setEditTeacherId(item.homeroomTeacherId ?? "");
  }

  async function saveClassEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await execute({
      action: "class.save",
      id: editingClassId,
      name: editClassName,
      grade: Number(editGrade),
      schoolYearId: editSchoolYearId,
      teacherId: editTeacherId || null,
      archived: selectedClass?.settingsJson?.archived === true,
    });
    if (saved) setEditingClassId("");
  }

  async function grantClassAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await execute({
      action: "member.class-access",
      classId: selectedClassId,
      userId: String(form.get("userId") || ""),
      role: String(form.get("role") || "teacher"),
      enabled: true,
    });
    if (saved) event.currentTarget.reset();
  }

  return (
    <section className="mt-6 space-y-6">
      <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
        <h2 className="font-heading text-xl font-bold text-[var(--on-surface)]">Vận hành tổ chức</h2>
        <form onSubmit={saveOrganization} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <label><span className="font-heading text-xs font-bold">Tên tổ chức</span><input value={orgName} onChange={(event) => setOrgName(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label>
          <label><span className="font-heading text-xs font-bold">Mã tổ chức</span><input value={orgCode} onChange={(event) => setOrgCode(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl bg-[var(--surface-low)] px-3" /></label>
          <button disabled={busy} className="min-h-11 self-end rounded-full bg-[var(--primary)] px-5 font-heading text-xs font-bold text-white disabled:opacity-50">Lưu metadata</button>
        </form>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <h2 className="font-heading text-xl font-bold">Năm học</h2>
          <form onSubmit={createSchoolYear} className="mt-4 grid gap-3">
            <input name="name" required placeholder="2027-2028" className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3" />
            <div className="grid grid-cols-2 gap-3"><input name="startsAt" type="date" required className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3" /><input name="endsAt" type="date" required className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3" /></div>
            <label className="flex items-center gap-2 font-body text-sm"><input name="active" type="checkbox" /> Đặt làm năm học active</label>
            <button disabled={busy} className="min-h-11 rounded-full bg-[var(--primary)] px-5 font-heading text-xs font-bold text-white disabled:opacity-50">Tạo năm học</button>
          </form>
          <ul className="mt-4 space-y-2">
            {schoolYears.map((year) => (
              <li key={year.id} className="flex items-center justify-between gap-2 rounded-xl bg-[var(--surface-low)] px-3 py-2 font-body text-sm">
                <span>{year.name}</span>
                <span className="flex items-center gap-2"><span className="font-heading text-xs font-bold text-[var(--primary)]">{year.active ? "active" : "archived"}</span>{year.active ? <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Lưu trữ năm học ${year.name}? Các lớp thuộc năm này sẽ không còn xuất hiện trong luồng giáo viên.`)) void execute({ action: "school-year.archive", id: year.id, confirmation: "ARCHIVE" }); }} className="rounded-full bg-[var(--needs-improvement-soft)] px-3 py-1 font-heading text-xs font-bold text-[var(--needs-improvement)]">Lưu trữ</button> : <button type="button" disabled={busy} onClick={() => { if (window.confirm(`Kích hoạt năm học ${year.name}?`)) void execute({ action: "school-year.save", id: year.id, name: year.name, startsAt: new Date(year.startsAt).toISOString().slice(0, 10), endsAt: new Date(year.endsAt).toISOString().slice(0, 10), active: true }); }} className="rounded-full bg-[var(--primary-fixed)] px-3 py-1 font-heading text-xs font-bold text-[var(--primary)]">Kích hoạt</button>}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
          <h2 className="font-heading text-xl font-bold">Lớp học và phân công</h2>
          <form onSubmit={createClass} className="mt-4 grid gap-3">
            <input name="name" required placeholder="Lớp 1/7" className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3" />
            <div className="grid grid-cols-2 gap-3"><input name="grade" type="number" min="1" max="5" required placeholder="Khối 1–5" className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3" /><select name="schoolYearId" required defaultValue={schoolYears.find((year) => year.active)?.id ?? schoolYears[0]?.id ?? ""} className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3">{schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></div>
            <select name="teacherId" defaultValue="" className="min-h-11 rounded-xl bg-[var(--surface-low)] px-3"><option value="">Chưa phân công</option>{teacherCandidates.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select>
            <button disabled={busy} className="min-h-11 rounded-full bg-[var(--primary)] px-5 font-heading text-xs font-bold text-white disabled:opacity-50">Tạo lớp</button>
          </form>

          {editingClassId ? (
            <form onSubmit={saveClassEdit} className="mt-4 space-y-2 rounded-2xl border border-[var(--primary-fixed)] bg-[var(--surface-low)] p-4">
              <p className="font-heading text-sm font-bold">Chỉnh sửa lớp</p>
              <input value={editClassName} onChange={(event) => setEditClassName(event.target.value)} required className="min-h-10 w-full rounded-xl bg-[var(--surface-lowest)] px-3" />
              <div className="grid grid-cols-2 gap-2"><input value={editGrade} onChange={(event) => setEditGrade(event.target.value)} type="number" min="1" max="5" required className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3" /><select value={editSchoolYearId} onChange={(event) => setEditSchoolYearId(event.target.value)} className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3">{schoolYears.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></div>
              <select value={editTeacherId} onChange={(event) => setEditTeacherId(event.target.value)} className="min-h-10 w-full rounded-xl bg-[var(--surface-lowest)] px-3"><option value="">Chưa phân công</option>{teacherCandidates.map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select>
              <div className="flex gap-2"><button disabled={busy} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white">Lưu lớp</button><button type="button" onClick={() => setEditingClassId("")} className="min-h-10 rounded-full bg-[var(--surface-lowest)] px-4 font-heading text-xs font-bold">Hủy</button></div>
            </form>
          ) : null}

          <ul className="mt-4 space-y-2">
            {classes.map((item) => {
              const archived = item.settingsJson?.archived === true;
              return <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--surface-low)] px-3 py-2 font-body text-sm"><button type="button" onClick={() => setSelectedClassId(item.id)} className="text-left font-heading font-bold text-[var(--primary)]">{item.name} · khối {item.grade}<span className="block font-body text-xs text-[var(--on-surface-variant)]">{item.schoolYearName}</span></button><span className="flex gap-2"><button type="button" disabled={busy} onClick={() => startEditingClass(item)} className="rounded-full bg-[var(--surface-lowest)] px-3 py-1 font-heading text-xs font-bold text-[var(--primary)]">Sửa</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`${archived ? "Khôi phục" : "Lưu trữ"} ${item.name}?`)) void execute({ action: "class.save", id: item.id, schoolYearId: item.schoolYearId, name: item.name, grade: item.grade, teacherId: item.homeroomTeacherId, archived: !archived }); }} className="rounded-full bg-[var(--needs-improvement-soft)] px-3 py-1 font-heading text-xs font-bold text-[var(--needs-improvement)]">{archived ? "Khôi phục" : "Lưu trữ"}</button></span></li>;
            })}
          </ul>
        </div>
      </div>

      <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
        <h2 className="font-heading text-xl font-bold">Thành viên và quyền</h2>
        <p className="mt-2 font-body text-sm text-[var(--on-surface-variant)]">Role update, class-level grant/revoke và deactivate đều kiểm tra tenant ở server. Revoke/deactivate yêu cầu xác nhận.</p>
        <form onSubmit={inviteMember} className="mt-4 grid gap-2 rounded-2xl border border-[var(--primary-fixed)] bg-[var(--surface-low)] p-4 sm:grid-cols-[1fr_1fr_150px_auto]">
          <input name="email" type="email" required placeholder="email giáo viên" className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3 text-sm" />
          <input name="displayName" placeholder="Tên hiển thị (tùy chọn)" className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3 text-sm" />
          <select name="role" defaultValue="teacher" className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3 text-sm"><option value="teacher">teacher</option><option value="admin">admin</option><option value="staff">staff</option></select>
          <button disabled={busy} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white disabled:opacity-50">Mời thành viên</button>
        </form>
        <p className="mt-2 font-body text-xs text-[var(--on-surface-variant)]">Thành viên được mời sẽ hoàn tất đăng ký bằng đúng email này; hệ thống sẽ tự nhận membership đã cấp.</p>
        <div className="mt-4 space-y-2">
          {members.map((member) => {
            const pending = member.status === "invited";
            return <div key={member.userId} className="flex flex-col gap-2 rounded-xl bg-[var(--surface-low)] p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-heading text-sm font-bold">{member.displayName}</p><p className="font-body text-xs text-[var(--on-surface-variant)]">{member.email || "—"} · {pending ? "chờ đăng ký" : member.status}</p></div><div className="flex flex-wrap gap-2">{pending ? <span className="rounded-full bg-[var(--primary-fixed)] px-3 py-2 font-heading text-xs font-bold text-[var(--primary)]">Đã mời · {member.role}</span> : <><select value={member.role} disabled={busy} onChange={(event) => { if (window.confirm(`Đổi role của ${member.displayName} sang ${event.target.value}?`)) void execute({ action: "member.role", userId: member.userId, role: event.target.value }); }} className="min-h-10 rounded-full bg-[var(--surface-lowest)] px-3 font-body text-xs"><option value="admin">admin</option><option value="teacher">teacher</option><option value="staff">staff</option></select><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Thu hồi quyền của ${member.displayName}?`)) void execute({ action: "member.revoke", userId: member.userId, confirmation: "REVOKE" }); }} className="rounded-full bg-[var(--needs-improvement-soft)] px-3 py-2 font-heading text-xs font-bold text-[var(--needs-improvement)]">Revoke</button><button type="button" disabled={busy} onClick={() => { if (window.confirm(`Tạm khóa tài khoản ${member.displayName}?`)) void execute({ action: "member.deactivate", userId: member.userId, confirmation: "DEACTIVATE" }); }} className="rounded-full bg-[var(--needs-improvement-soft)] px-3 py-2 font-heading text-xs font-bold text-[var(--needs-improvement)]">Tạm khóa</button></>}</div></div>;
          })}
        </div>
        <form onSubmit={grantClassAccess} className="mt-5 grid gap-2 rounded-2xl border border-[var(--primary-fixed)] bg-[var(--surface-low)] p-4 sm:grid-cols-[1fr_1fr_auto]"><select name="userId" required defaultValue="" className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3"><option value="">Cấp quyền cho thành viên...</option>{members.filter((member) => member.status === "active").map((member) => <option key={member.userId} value={member.userId}>{member.displayName}</option>)}</select><select name="role" defaultValue="teacher" className="min-h-10 rounded-xl bg-[var(--surface-lowest)] px-3"><option value="teacher">teacher</option><option value="assistant">assistant</option></select><button disabled={busy || !selectedClassId} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white">Cấp vào lớp</button></form>
        <div className="mt-3 space-y-2">{selectedClassAccess.map((access) => { const member = members.find((item) => item.userId === access.userId); return <div key={`${access.classId}-${access.userId}`} className="flex items-center justify-between rounded-xl bg-[var(--surface-low)] px-3 py-2 font-body text-sm"><span>{member?.displayName ?? access.userId} · {access.role}</span><button type="button" disabled={busy} onClick={() => { if (window.confirm("Thu hồi quyền truy cập lớp này?")) void execute({ action: "member.class-access", classId: access.classId, userId: access.userId, role: access.role === "homeroom_teacher" ? "teacher" : access.role, enabled: false }); }} className="rounded-full bg-[var(--needs-improvement-soft)] px-3 py-1 font-heading text-xs font-bold text-[var(--needs-improvement)]">Thu hồi</button></div>; })}</div>
      </div>

      <div className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-6 soft-shadow">
        <h2 className="font-heading text-xl font-bold">Cấu hình behavior / badge / reward</h2>
        <p className="mt-2 font-body text-sm text-[var(--on-surface-variant)]">Tạo preset theo lớp đang chọn; thao tác chỉ nhận `classId` thuộc organization hiện tại.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void execute({ action: "behavior.save", classId: selectedClassId, name: String(form.get("name") || ""), category: String(form.get("category") || "positive"), defaultPoints: Number(form.get("defaultPoints")), active: true }); }} className="space-y-2"><input name="name" required placeholder="Behavior" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><select name="category" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm"><option value="positive">positive</option><option value="needs_improvement">needs_improvement</option></select><input name="defaultPoints" type="number" required placeholder="Điểm" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><button disabled={busy || !selectedClassId} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white">Tạo behavior</button></form>
          <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void execute({ action: "badge.save", classId: selectedClassId, name: String(form.get("name") || ""), description: String(form.get("description") || ""), active: true }); }} className="space-y-2"><input name="name" required placeholder="Badge" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><input name="description" required placeholder="Mô tả" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><button disabled={busy || !selectedClassId} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white">Tạo badge</button></form>
          <form onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); void execute({ action: "reward.save", classId: selectedClassId, name: String(form.get("name") || ""), description: String(form.get("description") || ""), costStars: Number(form.get("costStars")), stock: String(form.get("stock") || "") ? Number(form.get("stock")) : null, active: true }); }} className="space-y-2"><input name="name" required placeholder="Reward" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><input name="description" required placeholder="Mô tả" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><input name="costStars" type="number" min="1" required placeholder="Số sao" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><input name="stock" type="number" min="0" placeholder="Tồn kho (trống = không giới hạn)" className="min-h-10 w-full rounded-xl bg-[var(--surface-low)] px-3 text-sm" /><button disabled={busy || !selectedClassId} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white">Tạo reward</button></form>
        </div>
        {message ? <p role="status" className="mt-4 font-body text-sm text-[var(--on-surface-variant)]">{message}</p> : null}
      </div>
    </section>
  );
}
