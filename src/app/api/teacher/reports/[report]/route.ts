import { ensureAppUser } from "@/lib/auth/app-user";
import { authConfigured, getUserSession } from "@/lib/auth/server";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { buildCsv, type CsvRow } from "@/lib/reports/csv";
import {
  getTeacherActivityLedger,
  getTeacherMonthlySummary,
  getTeacherTaskAssignmentsReport,
  parseTeacherReportQuery,
  parseTeacherReportType,
  type TeacherReportType,
} from "@/lib/reports/queries";

export const dynamic = "force-dynamic";

const reportHeaders = {
  activity: [
    "Mã giao dịch",
    "Thời điểm",
    "Mã học sinh",
    "Họ và tên",
    "Loại ghi nhận",
    "Hành vi",
    "Điểm tích lũy",
    "Sao khả dụng",
    "Lý do",
    "Ghi chú",
    "Người ghi nhận",
  ],
  assignments: [
    "Mã lượt giao",
    "Mã nhiệm vụ",
    "Tên nhiệm vụ",
    "Trạng thái nhiệm vụ",
    "Phạm vi",
    "Sao thưởng",
    "Bắt đầu",
    "Hạn hoàn thành",
    "Mã học sinh",
    "Họ và tên",
    "Trạng thái lượt giao",
    "Hoàn thành lúc",
    "Giao lúc",
  ],
  "monthly-summary": [
    "Tháng",
    "Mã học sinh",
    "Họ và tên",
    "Số lượt ghi nhận",
    "Điểm tích lũy thay đổi",
    "Sao khả dụng thay đổi",
    "Tổng lượt giao nhiệm vụ",
    "Lượt hoàn thành nhiệm vụ",
    "Huy hiệu nhận được",
    "Lượt đổi quà",
  ],
} as const;

type ReportPageMetadata = {
  classContext: { id: string; organizationId: string };
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

function responseHeaders(reportType: TeacherReportType, filename: string, total: number, page: number, pageSize: number, hasMore: boolean): HeadersInit {
  return {
    "Cache-Control": "no-store",
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "X-Report-Total": String(total),
    "X-Report-Page": String(page),
    "X-Report-Page-Size": String(pageSize),
    "X-Report-Has-More": String(hasMore),
  };
}

function csvResponse(reportType: TeacherReportType, result: ReportPageMetadata, rows: readonly CsvRow[], month?: string) {
  const monthSuffix = month ? `-${month}` : "";
  const filename = `phudong-${reportType}-${result.classContext.id}${monthSuffix}-p${result.page}.csv`;
  return new Response(buildCsv(reportHeaders[reportType], rows), {
    headers: responseHeaders(reportType, filename, result.total, result.page, result.pageSize, result.hasMore),
  });
}

async function recordReportExport(userId: string, reportType: TeacherReportType, result: ReportPageMetadata, month?: string) {
  await db.insert(auditLogs).values({
    organizationId: result.classContext.organizationId,
    actorUserId: userId,
    entityType: "report_export",
    entityId: result.classContext.id,
    action: "exported",
    afterJson: { reportType, page: result.page, pageSize: result.pageSize, month: month ?? null },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  if (!authConfigured) return new Response("Authentication is not configured.", { status: 503 });
  const session = await getUserSession();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });

  const reportType = parseTeacherReportType((await params).report);
  if (!reportType) return new Response("Unknown report.", { status: 404 });

  const requestUrl = new URL(request.url);
  const parsedQuery = parseTeacherReportQuery(reportType, requestUrl.searchParams);
  if (!parsedQuery) return new Response("Invalid report query.", { status: 400 });

  try {
    await ensureAppUser({ id: session.user.id, email: session.user.email, name: session.user.name });

    if (parsedQuery.type === "activity") {
      const result = await getTeacherActivityLedger(session.user.id, parsedQuery.query);
      if (!result) return new Response("Forbidden", { status: 403 });
      await recordReportExport(session.user.id, reportType, result);
      return csvResponse(
        reportType,
        result,
        result.rows.map((row) => [
          row.id,
          row.occurredAt,
          row.studentCode,
          row.studentName,
          row.transactionType,
          row.behaviorName,
          row.lifetimeDelta,
          row.spendableDelta,
          row.reason,
          row.note,
          row.actorName,
        ]),
      );
    }

    if (parsedQuery.type === "assignments") {
      const result = await getTeacherTaskAssignmentsReport(session.user.id, parsedQuery.query);
      if (!result) return new Response("Forbidden", { status: 403 });
      await recordReportExport(session.user.id, reportType, result);
      return csvResponse(
        reportType,
        result,
        result.rows.map((row) => [
          row.assignmentId,
          row.taskId,
          row.taskTitle,
          row.taskStatus,
          row.scope,
          row.rewardStars,
          row.startsAt,
          row.dueAt,
          row.studentCode,
          row.studentName,
          row.assignmentStatus,
          row.completedAt,
          row.assignmentCreatedAt,
        ]),
      );
    }

    const result = await getTeacherMonthlySummary(session.user.id, parsedQuery.query);
    if (!result) return new Response("Forbidden", { status: 403 });
    await recordReportExport(session.user.id, reportType, result, parsedQuery.query.month);
    return csvResponse(
      reportType,
      result,
      result.rows.map((row) => [
        row.month,
        row.studentCode,
        row.studentName,
        row.scoreEvents,
        row.lifetimeDelta,
        row.spendableDelta,
        row.totalAssignments,
        row.completedAssignments,
        row.badgesEarned,
        row.rewardRedemptions,
      ]),
      parsedQuery.query.month,
    );
  } catch {
    return new Response("Could not export report.", { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
