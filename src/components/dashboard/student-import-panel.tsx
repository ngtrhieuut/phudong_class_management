"use client";

import { useState } from "react";
import readXlsxFile from "read-excel-file/browser";
import { CheckCircle, FileArrowUp, WarningCircle } from "@phosphor-icons/react";

type ImportContext = {
  organizationId: string;
  schoolYearId: string;
  classId: string;
  className: string;
};

type ImportRow = {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  gender?: string;
  birthDate?: string;
  group?: string;
  seatNumber?: number;
};

type ImportResult = {
  mode: "dry-run" | "committed";
  counts: { totalRows: number; validRows: number; invalidRows: number; errorCount: number; upsertCandidates: number };
  summary: { status: "ready" | "invalid"; logMessage: string };
  errors: Array<{ rowNumber: number; code: string; field?: string; message: string }>;
  rows?: ImportRow[];
  result?: { totalRows: number; createdStudents: number; updatedStudents: number; createdMemberships: number; updatedMemberships: number };
};

function parseDelimitedText(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

async function readRosterFile(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File import vượt quá 5 MB.");
  }
  if (file.name.toLocaleLowerCase().endsWith(".xlsx")) {
    const [sheet] = await readXlsxFile(file);
    const [headerRow = [], ...dataRows] = sheet?.data ?? [];
    const headers = headerRow.map((value) => String(value ?? ""));
    return {
      headers,
      rows: dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
    };
  }

  const text = await file.text();
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";
  const [headers = [], ...dataRows] = parseDelimitedText(text, delimiter);
  return {
    headers,
    rows: dataRows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))),
  };
}

export function StudentImportPanel({ context }: { context: ImportContext }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [source, setSource] = useState<{ headers: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runImport(confirm = false) {
    if (!source) return;
    setError(null);
    if (confirm) setIsCommitting(true);
    else setIsReading(true);
    try {
      const response = await fetch("/api/teacher/students/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context, ...source, confirm }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: ImportResult; error?: string } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error || "Không thể kiểm tra file.");
      setResult(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể xử lý file.");
    } finally {
      setIsReading(false);
      setIsCommitting(false);
    }
  }

  async function onFileChange(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setError(null);
    try {
      setIsReading(true);
      setSource(await readRosterFile(file));
      setIsReading(false);
    } catch {
      setIsReading(false);
      setError("Không đọc được file. Hãy dùng .xlsx, .csv hoặc .tsv.");
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-[var(--surface-lowest)] p-5 soft-shadow sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="font-heading text-sm font-bold uppercase tracking-[0.14em] text-[var(--tertiary)]">Nhập danh sách</p>
          <h1 className="mt-2 font-heading text-3xl font-bold text-[var(--primary)]">Danh sách học sinh · {context.className}</h1>
          <p className="mt-2 max-w-2xl font-body text-sm leading-6 text-[var(--on-surface-variant)]">Chọn file để hệ thống chuẩn hóa, kiểm tra lỗi và hiển thị bản xem trước. Chỉ khi bấm xác nhận, dữ liệu mới được ghi vào Neon trong một transaction.</p>
        </div>
        <label className="inline-flex min-h-12 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-5 font-heading text-sm font-bold text-white transition hover:bg-[var(--primary-container)]">
          <FileArrowUp size={20} weight="bold" /> Chọn file
          <input type="file" accept=".xlsx,.csv,.tsv,text/csv,text/tab-separated-values" className="sr-only" onChange={(event) => void onFileChange(event.target.files?.[0])} />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-[var(--surface-low)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-body text-sm text-[var(--on-surface-variant)]">{fileName ? `File đã chọn: ${fileName}` : "Hỗ trợ .xlsx, .csv và .tsv. Cột bắt buộc: Mã học sinh và Họ và tên."}</p>
        <a href="/templates/student-import-template.csv" download className="shrink-0 font-heading text-sm font-bold text-[var(--primary)] hover:underline">Tải template CSV</a>
      </div>
      {isReading ? <p className="mt-4 font-body text-sm text-[var(--primary)]">Đang đọc và chuẩn bị bản xem trước...</p> : null}
      {source && !result && !isReading ? <button type="button" onClick={() => void runImport()} className="mt-4 min-h-11 rounded-full bg-[var(--secondary-container)] px-5 font-heading text-sm font-bold text-[var(--secondary)]">Kiểm tra file</button> : null}
      {error ? <p role="alert" className="mt-4 flex items-center gap-2 font-body text-sm text-[var(--needs-improvement)]"><WarningCircle size={18} /> {error}</p> : null}

      {result ? (
        <div className="mt-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Tổng dòng", result.counts.totalRows],
              ["Hợp lệ", result.counts.validRows],
              ["Lỗi", result.counts.errorCount],
              ["Tạo mới", result.result?.createdStudents ?? "—"],
              ["Cập nhật", result.result?.updatedStudents ?? "—"],
            ].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-[var(--surface-low)] p-3"><p className="font-body text-xs text-[var(--on-surface-variant)]">{label}</p><p className="mt-1 font-heading text-xl font-bold text-[var(--primary)]">{value}</p></div>)}
          </div>
          {result.errors.length > 0 ? (
            <div className="rounded-2xl bg-[var(--needs-improvement-soft)] p-4">
              <p className="flex items-center gap-2 font-heading text-sm font-bold text-[var(--needs-improvement)]"><WarningCircle size={18} /> File cần được sửa trước khi nhập</p>
              <ul className="mt-3 space-y-1 font-body text-sm text-[var(--on-surface-variant)]">{result.errors.slice(0, 8).map((item, index) => <li key={`${item.code}-${item.rowNumber}-${index}`}>Dòng {item.rowNumber || "—"} · {item.field || "dữ liệu"}: {item.message}</li>)}</ul>
            </div>
          ) : (
            <div className="rounded-2xl bg-[var(--positive-soft)] p-4"><p className="flex items-center gap-2 font-heading text-sm font-bold text-[var(--positive)]"><CheckCircle size={18} weight="fill" /> Bản xem trước hợp lệ, không phát hiện lỗi nghiêm trọng.</p><p className="mt-1 font-body text-xs text-[var(--on-surface-variant)]">{result.summary.logMessage}</p></div>
          )}
          {result.rows?.length ? <div className="overflow-x-auto rounded-2xl border border-[var(--surface-high)]"><table className="min-w-full text-left"><thead className="bg-[var(--surface-low)]"><tr>{["Dòng", "Mã học sinh", "Họ và tên", "Giới tính", "Ngày sinh", "Tổ", "Số ghế"].map((heading) => <th key={heading} className="px-3 py-3 font-heading text-xs font-bold text-[var(--on-surface-variant)]">{heading}</th>)}</tr></thead><tbody>{result.rows.slice(0, 12).map((row) => <tr key={row.rowNumber} className="border-t border-[var(--surface-high)]"><td className="px-3 py-3 font-body text-xs">{row.rowNumber}</td><td className="px-3 py-3 font-body text-sm">{row.studentCode}</td><td className="px-3 py-3 font-body text-sm">{row.fullName}</td><td className="px-3 py-3 font-body text-sm">{row.gender || "—"}</td><td className="px-3 py-3 font-body text-sm">{row.birthDate || "—"}</td><td className="px-3 py-3 font-body text-sm">{row.group || "—"}</td><td className="px-3 py-3 font-body text-sm">{row.seatNumber || "—"}</td></tr>)}</tbody></table></div> : null}
          {result.summary.status === "ready" && result.mode === "dry-run" ? <button type="button" disabled={isCommitting} onClick={() => void runImport(true)} className="min-h-12 rounded-full bg-[var(--primary)] px-6 font-heading text-sm font-bold text-white disabled:opacity-50">{isCommitting ? "Đang ghi vào Neon..." : "Xác nhận nhập danh sách"}</button> : null}
          {result.mode === "committed" ? <p className="font-body text-sm text-[var(--positive)]">Đã hoàn tất import. Có thể tải lại trang danh sách để xem dữ liệu mới.</p> : null}
        </div>
      ) : null}
    </section>
  );
}
