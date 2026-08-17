import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  behaviorTemplates,
  classStudents,
  rewardRedemptions,
  scoreTransactions,
  studentBadges,
  students,
  taskAssignments,
  tasks,
  users,
} from "@/db/schema";
import { getTeacherClass, type TeacherClassContext } from "@/lib/classroom/queries";
import { buildMonthlySummaryRow, type MonthlySummaryRow } from "@/lib/reports/summary";

export const teacherReportTypes = ["activity", "assignments", "monthly-summary"] as const;
export type TeacherReportType = (typeof teacherReportTypes)[number];

export const DEFAULT_REPORT_PAGE_SIZE = 250;
export const MAX_REPORT_PAGE_SIZE = 500;
const MAX_REPORT_PAGE = 10_000;
const REPORT_TIME_ZONE_OFFSET_MINUTES = 7 * 60;

type Pagination = {
  page: number;
  pageSize: number;
};

export type ActivityLedgerQuery = Pagination & { classId?: string };
export type TaskAssignmentsQuery = Pagination & { classId?: string };
export type MonthlySummaryQuery = Pagination & {
  classId?: string;
  month: string;
  from: Date;
  to: Date;
};

export type ActivityLedgerRow = {
  id: string;
  occurredAt: Date;
  studentCode: string;
  studentName: string;
  transactionType: string;
  behaviorName: string | null;
  lifetimeDelta: number;
  spendableDelta: number;
  reason: string;
  note: string | null;
  actorName: string | null;
};

export type TaskAssignmentReportRow = {
  assignmentId: string;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  scope: string;
  rewardStars: number;
  startsAt: Date;
  dueAt: Date;
  studentCode: string;
  studentName: string;
  assignmentStatus: string;
  completedAt: Date | null;
  assignmentCreatedAt: Date;
};

export type PaginatedReport<T> = {
  classContext: TeacherClassContext;
  rows: T[];
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
};

export type ParsedReportQuery =
  | { type: "activity"; query: ActivityLedgerQuery }
  | { type: "assignments"; query: TaskAssignmentsQuery }
  | { type: "monthly-summary"; query: MonthlySummaryQuery };

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(MAX_REPORT_PAGE).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_REPORT_PAGE_SIZE).default(DEFAULT_REPORT_PAGE_SIZE),
});

const uuidSchema = z.string().uuid().optional();
const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;

export function parseTeacherReportType(value: string): TeacherReportType | null {
  return (teacherReportTypes as readonly string[]).includes(value) ? (value as TeacherReportType) : null;
}

export function parseReportMonth(value: string): { month: string; from: Date; to: Date } | null {
  const match = monthPattern.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const offset = REPORT_TIME_ZONE_OFFSET_MINUTES * 60 * 1000;
  const from = new Date(Date.UTC(year, monthIndex, 1) - offset);
  const to = new Date(Date.UTC(year, monthIndex + 1, 1) - offset);
  return { month: value, from, to };
}

export function currentReportMonth(now = new Date()): string {
  const vietnamTime = new Date(now.getTime() + REPORT_TIME_ZONE_OFFSET_MINUTES * 60 * 1000);
  return `${vietnamTime.getUTCFullYear()}-${String(vietnamTime.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function parseTeacherReportQuery(
  type: TeacherReportType,
  searchParams: URLSearchParams,
): ParsedReportQuery | null {
  const classIdResult = uuidSchema.safeParse(searchParams.get("classId") || undefined);
  if (!classIdResult.success) return null;

  const paginationResult = paginationSchema.safeParse({
    page: searchParams.get("page") || undefined,
    pageSize: searchParams.get("pageSize") || undefined,
  });
  if (!paginationResult.success) return null;

  const pagination = { ...paginationResult.data, classId: classIdResult.data };
  if (type !== "monthly-summary") {
    return type === "activity"
      ? { type, query: pagination }
      : { type, query: pagination };
  }

  const month = searchParams.get("month");
  if (!month) return null;
  const monthRange = parseReportMonth(month);
  if (!monthRange) return null;
  return { type, query: { ...pagination, ...monthRange } };
}

function pageOffset(query: Pagination): number {
  return (query.page - 1) * query.pageSize;
}

function pageResult<T>(
  classContext: TeacherClassContext,
  query: Pagination,
  rows: T[],
  totalValue: unknown,
): PaginatedReport<T> {
  const total = Number(totalValue) || 0;
  return {
    classContext,
    rows,
    page: query.page,
    pageSize: query.pageSize,
    total,
    hasMore: pageOffset(query) + rows.length < total,
  };
}

export async function getTeacherActivityLedger(
  userId: string,
  query: ActivityLedgerQuery,
): Promise<PaginatedReport<ActivityLedgerRow> | null> {
  const classContext = await getTeacherClass(userId, query.classId);
  if (!classContext) return null;

  const classFilter = eq(scoreTransactions.classId, classContext.id);
  const [totalRows, rows] = await Promise.all([
    db.select({ total: sql<number>`count(${scoreTransactions.id})` }).from(scoreTransactions).where(classFilter),
    db
      .select({
        id: scoreTransactions.id,
        occurredAt: scoreTransactions.occurredAt,
        studentCode: students.studentCode,
        studentName: students.fullName,
        transactionType: scoreTransactions.transactionType,
        behaviorName: behaviorTemplates.name,
        lifetimeDelta: scoreTransactions.lifetimeDelta,
        spendableDelta: scoreTransactions.spendableDelta,
        reason: scoreTransactions.reason,
        note: scoreTransactions.note,
        actorName: users.displayName,
      })
      .from(scoreTransactions)
      .innerJoin(
        classStudents,
        and(
          eq(classStudents.classId, scoreTransactions.classId),
          eq(classStudents.studentId, scoreTransactions.studentId),
        ),
      )
      .innerJoin(students, eq(students.id, scoreTransactions.studentId))
      .leftJoin(behaviorTemplates, eq(behaviorTemplates.id, scoreTransactions.behaviorTemplateId))
      .leftJoin(users, eq(users.id, scoreTransactions.actorUserId))
      .where(classFilter)
      .orderBy(desc(scoreTransactions.occurredAt), desc(scoreTransactions.id))
      .limit(query.pageSize)
      .offset(pageOffset(query)),
  ]);

  return pageResult(classContext, query, rows, totalRows[0]?.total);
}

export async function getTeacherTaskAssignmentsReport(
  userId: string,
  query: TaskAssignmentsQuery,
): Promise<PaginatedReport<TaskAssignmentReportRow> | null> {
  const classContext = await getTeacherClass(userId, query.classId);
  if (!classContext) return null;

  const classFilter = eq(tasks.classId, classContext.id);
  const [totalRows, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(${taskAssignments.id})` })
      .from(taskAssignments)
      .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
      .where(classFilter),
    db
      .select({
        assignmentId: taskAssignments.id,
        taskId: tasks.id,
        taskTitle: tasks.title,
        taskStatus: tasks.status,
        scope: tasks.scope,
        rewardStars: tasks.rewardStars,
        startsAt: tasks.startsAt,
        dueAt: tasks.dueAt,
        studentCode: students.studentCode,
        studentName: students.fullName,
        assignmentStatus: taskAssignments.status,
        completedAt: taskAssignments.completedAt,
        assignmentCreatedAt: taskAssignments.createdAt,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
      .innerJoin(
        classStudents,
        and(
          eq(classStudents.classId, tasks.classId),
          eq(classStudents.studentId, taskAssignments.studentId),
        ),
      )
      .innerJoin(students, eq(students.id, taskAssignments.studentId))
      .where(classFilter)
      .orderBy(desc(tasks.dueAt), asc(students.fullName), desc(taskAssignments.id))
      .limit(query.pageSize)
      .offset(pageOffset(query)),
  ]);

  return pageResult(classContext, query, rows, totalRows[0]?.total);
}

export async function getTeacherMonthlySummary(
  userId: string,
  query: MonthlySummaryQuery,
): Promise<PaginatedReport<MonthlySummaryRow> | null> {
  const classContext = await getTeacherClass(userId, query.classId);
  if (!classContext) return null;

  const classFilter = eq(classStudents.classId, classContext.id);
  const monthlyScores = db
    .select({
      studentId: scoreTransactions.studentId,
      scoreEvents: sql<number>`count(${scoreTransactions.id})`,
      lifetimeDelta: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
      spendableDelta: sql<number>`coalesce(sum(${scoreTransactions.spendableDelta}), 0)`,
    })
    .from(scoreTransactions)
    .where(
      and(
        eq(scoreTransactions.classId, classContext.id),
        gte(scoreTransactions.occurredAt, query.from),
        lt(scoreTransactions.occurredAt, query.to),
      ),
    )
    .groupBy(scoreTransactions.studentId)
    .as("monthly_scores");

  const monthlyTasks = db
    .select({
      studentId: taskAssignments.studentId,
      totalAssignments: sql<number>`count(${taskAssignments.id})`,
      completedAssignments: sql<number>`count(${taskAssignments.id}) filter (where ${taskAssignments.status} = 'completed')`,
    })
    .from(taskAssignments)
    .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
    .where(
      and(
        eq(tasks.classId, classContext.id),
        gte(taskAssignments.createdAt, query.from),
        lt(taskAssignments.createdAt, query.to),
      ),
    )
    .groupBy(taskAssignments.studentId)
    .as("monthly_tasks");

  const monthlyBadges = db
    .select({
      studentId: studentBadges.studentId,
      badgesEarned: sql<number>`count(${studentBadges.id})`,
    })
    .from(studentBadges)
    .where(
      and(
        eq(studentBadges.classId, classContext.id),
        gte(studentBadges.awardedAt, query.from),
        lt(studentBadges.awardedAt, query.to),
      ),
    )
    .groupBy(studentBadges.studentId)
    .as("monthly_badges");

  const monthlyRewards = db
    .select({
      studentId: rewardRedemptions.studentId,
      rewardRedemptions: sql<number>`count(${rewardRedemptions.id})`,
    })
    .from(rewardRedemptions)
    .where(
      and(
        eq(rewardRedemptions.classId, classContext.id),
        gte(rewardRedemptions.requestedAt, query.from),
        lt(rewardRedemptions.requestedAt, query.to),
      ),
    )
    .groupBy(rewardRedemptions.studentId)
    .as("monthly_rewards");

  const activeStudentFilter = and(classFilter, isNull(classStudents.leftAt), eq(students.status, "active"));
  const [totalRows, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(${classStudents.studentId})` })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .where(activeStudentFilter),
    db
      .select({
        studentId: students.id,
        studentCode: students.studentCode,
        studentName: students.fullName,
        scoreEvents: sql<number>`coalesce(${monthlyScores.scoreEvents}, 0)`,
        lifetimeDelta: sql<number>`coalesce(${monthlyScores.lifetimeDelta}, 0)`,
        spendableDelta: sql<number>`coalesce(${monthlyScores.spendableDelta}, 0)`,
        totalAssignments: sql<number>`coalesce(${monthlyTasks.totalAssignments}, 0)`,
        completedAssignments: sql<number>`coalesce(${monthlyTasks.completedAssignments}, 0)`,
        badgesEarned: sql<number>`coalesce(${monthlyBadges.badgesEarned}, 0)`,
        rewardRedemptions: sql<number>`coalesce(${monthlyRewards.rewardRedemptions}, 0)`,
      })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .leftJoin(monthlyScores, eq(monthlyScores.studentId, classStudents.studentId))
      .leftJoin(monthlyTasks, eq(monthlyTasks.studentId, classStudents.studentId))
      .leftJoin(monthlyBadges, eq(monthlyBadges.studentId, classStudents.studentId))
      .leftJoin(monthlyRewards, eq(monthlyRewards.studentId, classStudents.studentId))
      .where(activeStudentFilter)
      .orderBy(asc(classStudents.seatNo), asc(students.fullName), asc(students.id))
      .limit(query.pageSize)
      .offset(pageOffset(query)),
  ]);

  const summaryRows = rows.map((row) =>
    buildMonthlySummaryRow(
      { studentId: row.studentId, studentCode: row.studentCode, studentName: row.studentName },
      query.month,
      row,
    ),
  );
  return pageResult(classContext, query, summaryRows, totalRows[0]?.total);
}
