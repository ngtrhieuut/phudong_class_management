"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { MagnifyingGlass, SlidersHorizontal, UsersThree } from "@phosphor-icons/react";
import { StudentCard } from "@/components/dashboard/student-card";
import type { DemoStudent } from "@/lib/demo-data";

export function StudentsScreen({ initialStudents, exportHref, importHref = "/teacher/students/import" }: { initialStudents: DemoStudent[]; exportHref?: string; importHref?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("Tất cả tổ");
  const groups = ["Tất cả tổ", ...new Set(initialStudents.map((student) => student.group))];
  const filteredStudents = useMemo(
    () =>
      initialStudents.filter((student) => {
        const normalizedQuery = query.toLocaleLowerCase();
        const matchesQuery =
          student.name.toLocaleLowerCase().includes(normalizedQuery) ||
          student.studentCode?.toLocaleLowerCase().includes(normalizedQuery) ||
          student.group.toLocaleLowerCase().includes(normalizedQuery);
        const matchesGroup = group === "Tất cả tổ" || student.group === group;
        return matchesQuery && matchesGroup;
      }),
    [group, initialStudents, query],
  );

  return (
    <div className="mx-auto max-w-[1480px] px-5 py-7 sm:px-8 lg:px-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Danh sách lớp</p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-[-0.03em] text-[var(--primary)]">Học sinh</h1>
          <p className="mt-3 font-body text-base text-[var(--on-surface-variant)]">Theo dõi tiến bộ và ghi nhận nhanh cho từng bạn.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-full bg-[var(--surface-low)] px-4 py-3 font-heading text-sm font-bold text-[var(--primary)]">
            <UsersThree size={20} weight="fill" /> {initialStudents.length} học sinh
          </div>
          <Link href={importHref} className="inline-flex min-h-11 items-center rounded-full bg-[var(--primary)] px-4 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]">Nhập danh sách</Link>
          {exportHref ? <a href={exportHref} className="inline-flex min-h-11 items-center rounded-full bg-[var(--surface-low)] px-4 font-heading text-sm font-bold text-[var(--primary)] transition hover:bg-[var(--surface-container)]">Xuất CSV</a> : null}
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-3 rounded-[1.5rem] bg-[var(--surface-lowest)] p-4 soft-shadow sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Tìm học sinh</span>
          <MagnifyingGlass size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--on-surface-variant)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên hoặc tổ..."
            className="min-h-12 w-full rounded-full border-2 border-transparent bg-[var(--surface-low)] pl-12 pr-4 font-body outline-none transition placeholder:text-[var(--outline)] focus:border-[var(--primary-fixed)] focus:bg-[var(--surface-lowest)]"
          />
        </label>
        <div className="flex items-center gap-2 overflow-x-auto">
          <SlidersHorizontal size={18} className="shrink-0 text-[var(--on-surface-variant)]" />
          {groups.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setGroup(item)}
              className={"min-h-10 shrink-0 rounded-full px-4 font-heading text-xs font-bold transition " + (group === item ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-low)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]")}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {filteredStudents.length > 0 ? (
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStudents.map((student) => (
            <StudentCard key={student.id} student={student} onScore={() => undefined} onOpen={(studentId) => { router.push("/teacher/students/" + studentId); }} />
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-[var(--outline-variant)] bg-[var(--surface-lowest)] px-6 py-16 text-center">
          <UsersThree size={40} className="mx-auto text-[var(--outline)]" />
          <h2 className="mt-4 font-heading text-xl font-bold text-[var(--on-surface)]">Chưa tìm thấy học sinh</h2>
          <p className="mt-2 font-body text-sm text-[var(--on-surface-variant)]">Thử một tên khác hoặc bỏ bộ lọc tổ.</p>
        </div>
      )}
    </div>
  );
}
