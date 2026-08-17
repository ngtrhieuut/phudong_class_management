import { describe, expect, it } from "vitest";

import { buildCsv, escapeCsvCell } from "../../src/lib/reports/csv";
import { parseReportMonth, parseTeacherReportQuery } from "../../src/lib/reports/queries";
import { buildMonthlySummaryRow } from "../../src/lib/reports/summary";

describe("CSV report helpers", () => {
  it("quotes cells and neutralizes spreadsheet formula prefixes", () => {
    expect(escapeCsvCell('=HYPERLINK("https://example.com")')).toBe('"\'=HYPERLINK(""https://example.com"")"');
    expect(escapeCsvCell("a,b\n\"note\"")).toBe('"a,b\n""note"""');
    expect(escapeCsvCell(-5)).toBe("\"'-5\"");
  });

  it("builds UTF-8 CSV with a bounded row set", () => {
    expect(buildCsv(["Tên", "Điểm"], [["Nguyễn An", 5]])).toBe("\uFEFF\"Tên\",\"Điểm\"\r\n\"Nguyễn An\",\"5\"\r\n");
  });

  it("accepts only bounded, typed report query parameters", () => {
    const classId = "11111111-1111-4111-8111-111111111111";
    expect(parseTeacherReportQuery("activity", new URLSearchParams({ classId, page: "2", pageSize: "500" }))).toEqual({
      type: "activity",
      query: { classId, page: 2, pageSize: 500 },
    });
    expect(parseTeacherReportQuery("activity", new URLSearchParams({ classId, pageSize: "501" }))).toBeNull();
    expect(parseTeacherReportQuery("monthly-summary", new URLSearchParams({ classId, month: "2026-13" }))).toBeNull();
  });

  it("converts a Vietnam-local month to a half-open UTC range", () => {
    const range = parseReportMonth("2026-08");
    expect(range?.from.toISOString()).toBe("2026-07-31T17:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-08-31T17:00:00.000Z");
  });
});

describe("monthly summary helper", () => {
  it("normalizes database numeric values and fills missing aggregates", () => {
    expect(
      buildMonthlySummaryRow(
        { studentId: "student-1", studentCode: "HS-001", studentName: "Nguyễn An" },
        "2026-08",
        { scoreEvents: "3", lifetimeDelta: "12", completedAssignments: "2", badgesEarned: null },
      ),
    ).toEqual({
      studentId: "student-1",
      studentCode: "HS-001",
      studentName: "Nguyễn An",
      month: "2026-08",
      scoreEvents: 3,
      lifetimeDelta: 12,
      spendableDelta: 0,
      totalAssignments: 0,
      completedAssignments: 2,
      badgesEarned: 0,
      rewardRedemptions: 0,
    });
  });
});
