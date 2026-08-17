export type CsvValue = string | number | boolean | bigint | Date | null | undefined;

export type CsvRow = readonly CsvValue[];

function stringifyCsvValue(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  return String(value);
}

/**
 * Escape one cell for RFC 4180-style CSV and neutralize spreadsheet formulas.
 * The leading apostrophe is intentional: it keeps values beginning with a
 * formula-like character as text when opened by spreadsheet applications.
 */
export function escapeCsvCell(value: CsvValue): string {
  const text = stringifyCsvValue(value);
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function buildCsv(headers: CsvRow, rows: readonly CsvRow[]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n")}\r\n`;
}
