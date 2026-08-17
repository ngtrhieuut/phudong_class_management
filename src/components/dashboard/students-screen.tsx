"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Cards, ListBullets, MagnifyingGlass, Rows, SlidersHorizontal, UsersThree } from "@phosphor-icons/react";

import { StudentAvatarPicker } from "@/components/ui/avatar-template-picker";
import { StudentCard } from "@/components/dashboard/student-card";
import type { DemoStudent } from "@/lib/demo-data";

type ViewMode = "cards" | "list" | "detail";

const genderLabels: Record<NonNullable<DemoStudent["gender"]>, string> = {
  male: "Nam",
  female: "Nữ",
  other: "Khác",
  undisclosed: "Chưa khai báo",
};

function formatBirthDate(value: string | null | undefined) {
  if (!value) return "Chưa có ngày sinh";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("vi-VN");
}

function initials(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";
}

export function StudentsScreen({
  initialStudents,
  initialQuery = "",
  classId,
  exportHref,
  importHref = "/teacher/students/import",
  scoreClassId,
}: {
  initialStudents: DemoStudent[];
  initialQuery?: string;
  classId?: string;
  exportHref?: string;
  importHref?: string;
  scoreClassId?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [group, setGroup] = useState("Tất cả tổ");
  const [classRole, setClassRole] = useState("Tất cả chức vụ");
  const [gender, setGender] = useState("Tất cả giới tính");
  const [level, setLevel] = useState("Tất cả level");
  const [taskStatus, setTaskStatus] = useState("Tất cả trạng thái");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const groups = ["Tất cả tổ", ...new Set(initialStudents.map((student) => student.group))];
  const classRoles = ["Tất cả chức vụ", ...new Set(initialStudents.map((student) => student.classRole).filter((value): value is string => Boolean(value)))];
  const levels = ["Tất cả level", ...new Set(initialStudents.map((student) => student.level))];
  const taskStatuses = ["Tất cả trạng thái", "Đã xong", "Đang làm", "Chưa bắt đầu"];
  const filteredStudents = useMemo(
    () =>
      initialStudents.filter((student) => {
        const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
        const parentText = student.guardians?.map((guardian) => [guardian.fullName, guardian.phone, guardian.email].filter(Boolean).join(" ")).join(" ") ?? "";
        const searchableText = [student.name, student.studentCode, student.group, student.classRole, parentText].filter(Boolean).join(" ").toLocaleLowerCase("vi-VN");
        const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery);
        const matchesGroup = group === "Tất cả tổ" || student.group === group;
        const matchesClassRole = classRole === "Tất cả chức vụ" || student.classRole === classRole;
        const matchesGender = gender === "Tất cả giới tính" || genderLabels[student.gender ?? "undisclosed"] === gender;
        const matchesLevel = level === "Tất cả level" || student.level === level;
        const matchesTaskStatus = taskStatus === "Tất cả trạng thái" || student.taskStatus === taskStatus;
        return matchesQuery && matchesGroup && matchesClassRole && matchesGender && matchesLevel && matchesTaskStatus;
      }),
    [classRole, gender, group, initialStudents, level, query, taskStatus],
  );

  function openScore(studentId: string) {
    const scoreQuery = new URLSearchParams({ scoreStudent: studentId });
    if (scoreClassId) scoreQuery.set("classId", scoreClassId);
    router.push("/teacher/dashboard?" + scoreQuery.toString());
  }

  const viewOptions: Array<{ id: ViewMode; label: string; Icon: typeof Cards }> = [
    { id: "cards", label: "Thẻ", Icon: Cards },
    { id: "list", label: "Danh sách", Icon: ListBullets },
    { id: "detail", label: "Chi tiết", Icon: Rows },
  ];

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Danh sách lớp</p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.03em] text-[var(--primary)]">Học sinh</h1>
          <p className="mt-3 font-body text-base text-[var(--on-surface-variant)]">Theo dõi tiến bộ, hồ sơ gia đình và ghi nhận nhanh cho từng bạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-[var(--surface-low)] px-4 py-3 font-heading text-sm font-bold text-[var(--primary)]"><UsersThree size={20} weight="fill" /> {filteredStudents.length}/{initialStudents.length} học sinh</div>
          <Link href={importHref} className="inline-flex min-h-11 items-center rounded-full bg-[var(--primary)] px-4 font-heading text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-container)] hover:shadow-lg hover:shadow-blue-900/15 active:scale-[0.98]">Nhập danh sách</Link>
          {exportHref ? <a href={exportHref} className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface-low)] px-4 font-heading text-sm font-bold text-[var(--primary)] transition hover:-translate-y-0.5 hover:bg-[var(--surface-container)] active:scale-[0.98]">Xuất CSV</a> : null}
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-3 rounded-[1.5rem] bg-[var(--surface-lowest)] p-4 soft-shadow sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Tìm học sinh hoặc phụ huynh</span>
          <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên học sinh, phụ huynh, số điện thoại hoặc mã..." className="min-h-12 w-full rounded-full border-2 border-transparent bg-[var(--surface-low)] pl-12 pr-4 font-body outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary-fixed)] focus:bg-[var(--surface-lowest)]" />
        </label>
        <div className="flex items-center gap-1 rounded-full bg-[var(--surface-low)] p-1" aria-label="Chế độ hiển thị">
          {viewOptions.map(({ id, label, Icon }) => <button key={id} type="button" aria-pressed={viewMode === id} onClick={() => setViewMode(id)} className={`inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 font-heading text-xs font-bold transition hover:-translate-y-0.5 active:scale-95 ${viewMode === id ? "bg-[var(--primary)] text-white shadow-md shadow-blue-900/15" : "text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]"}`}><Icon size={16} weight={viewMode === id ? "fill" : "regular"} /><span className="hidden sm:inline">{label}</span></button>)}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
        <SlidersHorizontal size={18} className="shrink-0 text-[var(--on-surface-variant)]" />
        {groups.map((item) => <button key={item} type="button" onClick={() => setGroup(item)} className={`min-h-10 shrink-0 rounded-full px-4 font-heading text-xs font-bold transition hover:-translate-y-0.5 active:scale-95 ${group === item ? "bg-[var(--primary)] text-white shadow-md shadow-blue-900/10" : "bg-[var(--surface-lowest)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]"}`}>{item}</button>)}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="font-body text-sm"><span className="sr-only">Lọc theo chức vụ</span><select value={classRole} onChange={(event) => setClassRole(event.target.value)} className="min-h-11 w-full rounded-xl bg-[var(--surface-lowest)] px-3 font-body text-sm soft-shadow"><option value="Tất cả chức vụ">Tất cả chức vụ</option>{classRoles.filter((item) => item !== "Tất cả chức vụ").map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="font-body text-sm"><span className="sr-only">Lọc theo giới tính</span><select value={gender} onChange={(event) => setGender(event.target.value)} className="min-h-11 w-full rounded-xl bg-[var(--surface-lowest)] px-3 font-body text-sm soft-shadow"><option value="Tất cả giới tính">Tất cả giới tính</option>{Object.values(genderLabels).map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label className="font-body text-sm"><span className="sr-only">Lọc theo level</span><select value={level} onChange={(event) => setLevel(event.target.value)} className="min-h-11 w-full rounded-xl bg-[var(--surface-lowest)] px-3 font-body text-sm soft-shadow"><option value="Tất cả level">Tất cả level</option>{levels.filter((item) => item !== "Tất cả level").map((item) => <option key={item} value={item}>Level {item}</option>)}</select></label>
        <label className="font-body text-sm"><span className="sr-only">Lọc theo trạng thái nhiệm vụ</span><select value={taskStatus} onChange={(event) => setTaskStatus(event.target.value)} className="min-h-11 w-full rounded-xl bg-[var(--surface-lowest)] px-3 font-body text-sm soft-shadow"><option value="Tất cả trạng thái">Tất cả trạng thái nhiệm vụ</option>{taskStatuses.filter((item) => item !== "Tất cả trạng thái").map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>

      {filteredStudents.length > 0 ? (
        viewMode === "cards" ? (
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{filteredStudents.map((student) => <StudentCard key={student.id} student={student} classId={classId ?? null} onScore={openScore} onOpen={(studentId) => router.push("/teacher/students/" + studentId)} />)}</div>
        ) : viewMode === "list" ? (
          <div className="mt-8 space-y-3">{filteredStudents.map((student) => <article key={student.id} className="soft-shadow-hover flex flex-col gap-4 rounded-3xl border border-transparent bg-[var(--surface-lowest)] p-4 soft-shadow sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-3">{classId ? <StudentAvatarPicker classId={classId} studentId={student.id} value={student.avatarUrl} gender={student.gender === "male" || student.gender === "female" ? student.gender : null} fallback={<span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-[var(--primary-fixed)] font-heading text-lg font-bold text-[var(--primary)]">{student.shortName}</span>} /> : <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary-fixed)] font-heading font-bold text-[var(--primary)]">{student.shortName}</span>}<div className="min-w-0"><Link href={`/teacher/students/${student.id}`} className="truncate font-heading text-lg font-bold text-[var(--on-surface)] transition hover:text-[var(--primary)] hover:underline">{student.name}</Link><p className="mt-1 truncate font-body text-sm text-[var(--on-surface-variant)]">{student.studentCode} · {student.group}{student.classRole ? ` · ${student.classRole}` : ""}</p><p className="mt-1 truncate font-body text-xs text-[var(--outline)]">PH: {student.guardians?.map((guardian) => guardian.fullName).join(" · ") || "Chưa cập nhật"}</p></div></div><div className="grid grid-cols-2 gap-2 text-sm sm:flex sm:items-center"><span className="rounded-full bg-[var(--secondary-container)]/40 px-3 py-2 font-heading text-xs font-bold text-[var(--secondary)]">★ {student.spendableStars} sao</span><span className="rounded-full bg-[var(--surface-low)] px-3 py-2 font-heading text-xs font-bold text-[var(--primary)]">{student.points} điểm</span><button type="button" onClick={() => openScore(student.id)} className="col-span-2 min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[var(--primary-container)] active:scale-95 sm:col-span-1">Cộng điểm</button></div></article>)}</div>
        ) : (
          <div className="mt-8 overflow-x-auto rounded-3xl bg-[var(--surface-lowest)] soft-shadow"><table className="min-w-[900px] w-full text-left"><thead className="bg-[var(--surface-low)]"><tr>{["Học sinh", "Ngày sinh", "Giới tính", "Tổ / chức vụ", "Phụ huynh", "Tiến bộ", ""].map((heading) => <th key={heading} className="px-4 py-4 font-heading text-xs font-bold uppercase tracking-wide text-[var(--on-surface-variant)]">{heading}</th>)}</tr></thead><tbody>{filteredStudents.map((student) => <tr key={student.id} className="border-t border-[var(--surface-high)] transition hover:bg-[var(--surface-low)]"><td className="px-4 py-3"><div className="flex items-center gap-3">{classId ? <StudentAvatarPicker classId={classId} studentId={student.id} value={student.avatarUrl} gender={student.gender === "male" || student.gender === "female" ? student.gender : null} fallback={<span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary-fixed)] font-heading font-bold text-[var(--primary)]">{initials(student.name)}</span>} /> : null}<div><Link href={`/teacher/students/${student.id}`} className="font-heading text-sm font-bold text-[var(--on-surface)] hover:text-[var(--primary)] hover:underline">{student.name}</Link><p className="mt-0.5 font-body text-xs text-[var(--outline)]">{student.studentCode}</p></div></div></td><td className="px-4 py-3 font-body text-sm text-[var(--on-surface-variant)]">{formatBirthDate(student.birthDate)}</td><td className="px-4 py-3 font-body text-sm text-[var(--on-surface-variant)]">{genderLabels[student.gender ?? "undisclosed"]}</td><td className="px-4 py-3 font-body text-sm text-[var(--on-surface-variant)]">{student.group}<br /><span className="font-heading text-xs font-bold text-[var(--primary)]">{student.classRole || "Chưa phân chức vụ"}</span></td><td className="max-w-56 px-4 py-3 font-body text-sm text-[var(--on-surface-variant)]">{student.guardians?.length ? student.guardians.map((guardian) => <span key={guardian.id} className="block truncate">{guardian.relationship}: {guardian.fullName}{guardian.phone ? ` · ${guardian.phone}` : ""}</span>) : "Chưa cập nhật"}</td><td className="px-4 py-3"><span className="font-heading text-sm font-bold text-[var(--primary)]">{student.points} điểm</span><span className="mt-1 block font-body text-xs text-[var(--on-surface-variant)]">Level {student.level}</span></td><td className="px-4 py-3"><button type="button" onClick={() => openScore(student.id)} className="min-h-10 rounded-full bg-[var(--primary)] px-4 font-heading text-xs font-bold text-white transition hover:bg-[var(--primary-container)] active:scale-95">Cộng điểm</button></td></tr>)}</tbody></table></div>
        )
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--outline-variant)] bg-[var(--surface-lowest)] px-6 py-16 text-center"><UsersThree size={40} className="mx-auto text-[var(--outline)]" /><h2 className="mt-4 font-heading text-xl font-bold text-[var(--on-surface)]">Chưa tìm thấy học sinh</h2><p className="mt-2 font-body text-sm text-[var(--on-surface-variant)]">Thử tên học sinh, tên phụ huynh, số điện thoại hoặc bỏ bớt bộ lọc.</p></div>
      )}
    </div>
  );
}
