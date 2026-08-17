import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classes,
  classMemberships,
  classStudents,
  guardians,
  notifications,
  scoreTransactions,
  studentGuardians,
  studentScoreSnapshots,
  students,
  taskAssignments,
  tasks,
  users,
} from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;
const taskInputSchema = z.object({
  classId: z.string().uuid(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(4000),
  scope: z.enum(["student", "group", "class"]).default("student"),
  rewardStars: z.number().int().min(0).max(10000).default(0),
  startsAt: z.coerce.date(),
  dueAt: z.coerce.date(),
  studentIds: z.array(z.string().uuid()).max(500).default([]),
}).refine((input) => input.dueAt >= input.startsAt, { message: "Hạn nhiệm vụ phải sau thời gian bắt đầu.", path: ["dueAt"] });

export class TaskServiceError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "FORBIDDEN_CLASS_ACCESS" | "STUDENT_NOT_IN_CLASS" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "TaskServiceError";
  }
}

export async function createClassTask(input: unknown, actorUserId: string) {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success || new Set(parsed.data.studentIds).size !== parsed.data.studentIds.length) throw new TaskServiceError("INVALID_INPUT", "Dữ liệu nhiệm vụ không hợp lệ.");
  return db.transaction(async (tx) => {
    const [access] = await tx.select({ organizationId: classes.organizationId }).from(classMemberships).innerJoin(users, eq(users.id, classMemberships.userId)).innerJoin(classes, eq(classes.id, classMemberships.classId)).where(and(eq(classMemberships.userId, actorUserId), eq(classMemberships.classId, parsed.data.classId), inArray(classMemberships.role, writeRoles), eq(users.status, "active"))).limit(1);
    if (!access) throw new TaskServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền tạo nhiệm vụ cho lớp này.");
    if (parsed.data.studentIds.length > 0) {
      const members = await tx.select({ studentId: classStudents.studentId }).from(classStudents).innerJoin(students, eq(students.id, classStudents.studentId)).where(and(eq(classStudents.classId, parsed.data.classId), inArray(classStudents.studentId, parsed.data.studentIds), isNull(classStudents.leftAt), eq(students.status, "active")));
      if (members.length !== parsed.data.studentIds.length) throw new TaskServiceError("STUDENT_NOT_IN_CLASS", "Có học sinh không thuộc lớp đang chọn.");
    }
    const [task] = await tx.insert(tasks).values({ classId: parsed.data.classId, title: parsed.data.title, description: parsed.data.description, scope: parsed.data.scope, rewardStars: parsed.data.rewardStars, completionMode: "manual", startsAt: parsed.data.startsAt, dueAt: parsed.data.dueAt, status: "active", createdBy: actorUserId }).returning({ id: tasks.id });
    if (parsed.data.studentIds.length > 0) await tx.insert(taskAssignments).values(parsed.data.studentIds.map((studentId) => ({ taskId: task.id, studentId })));
    await tx.insert(auditLogs).values({ organizationId: access.organizationId, actorUserId, entityType: "task", entityId: task.id, action: "created", afterJson: { studentCount: parsed.data.studentIds.length, rewardStars: parsed.data.rewardStars } });
    return task;
  });
}

export async function approveTaskAssignment(taskId: string, studentId: string, actorUserId: string) {
  return db.transaction(async (tx) => {
    const [assignment] = await tx.select({ assignmentId: taskAssignments.id, taskId: tasks.id, classId: tasks.classId, rewardStars: tasks.rewardStars, organizationId: classes.organizationId, currentStatus: taskAssignments.status }).from(taskAssignments).innerJoin(tasks, eq(tasks.id, taskAssignments.taskId)).innerJoin(classes, eq(classes.id, tasks.classId)).where(and(eq(taskAssignments.taskId, taskId), eq(taskAssignments.studentId, studentId))).limit(1);
    if (!assignment) throw new TaskServiceError("NOT_FOUND", "Không tìm thấy nhiệm vụ của học sinh.");
    const [access] = await tx.select({ userId: classMemberships.userId }).from(classMemberships).innerJoin(users, eq(users.id, classMemberships.userId)).where(and(eq(classMemberships.userId, actorUserId), eq(classMemberships.classId, assignment.classId), inArray(classMemberships.role, writeRoles), eq(users.status, "active"))).limit(1);
    if (!access) throw new TaskServiceError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền duyệt nhiệm vụ này.");
    if (assignment.currentStatus === "completed") return { assignmentId: assignment.assignmentId, alreadyCompleted: true };
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:task:${assignment.taskId}:${studentId}`}, 0))`);
    await tx.update(taskAssignments).set({ status: "completed", completedAt: new Date(), approvedBy: actorUserId, updatedAt: new Date() }).where(eq(taskAssignments.id, assignment.assignmentId));
    if (assignment.rewardStars > 0) {
      const occurredAt = new Date();
      await tx.insert(scoreTransactions).values({ classId: assignment.classId, studentId, actorUserId, transactionType: "task", lifetimeDelta: assignment.rewardStars, spendableDelta: assignment.rewardStars, reason: `Hoàn thành nhiệm vụ: ${taskId}`, occurredAt });
      await tx.insert(studentScoreSnapshots).values({ classId: assignment.classId, studentId, lifetimeScore: assignment.rewardStars, spendableStars: assignment.rewardStars, updatedAt: occurredAt }).onConflictDoUpdate({ target: [studentScoreSnapshots.classId, studentScoreSnapshots.studentId], set: { lifetimeScore: sql`${studentScoreSnapshots.lifetimeScore} + ${assignment.rewardStars}`, spendableStars: sql`${studentScoreSnapshots.spendableStars} + ${assignment.rewardStars}`, updatedAt: occurredAt } });
    }
    const guardianRows = await tx.select({ userId: guardians.userId }).from(studentGuardians).innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId)).innerJoin(users, eq(users.id, guardians.userId)).where(and(eq(studentGuardians.studentId, studentId), eq(studentGuardians.canView, true), eq(studentGuardians.receivesNotifications, true), eq(users.status, "active")));
    const guardianIds = [...new Set(guardianRows.map((row) => row.userId).filter((id): id is string => Boolean(id)))];
    if (guardianIds.length > 0) await tx.insert(notifications).values(guardianIds.map((userId) => ({ userId, type: "task_completed", title: "Con vừa hoàn thành một nhiệm vụ", body: "Một nỗ lực của con đã được ghi nhận.", deepLink: `/parent/tasks?studentId=${studentId}` })));
    await tx.insert(auditLogs).values({ organizationId: assignment.organizationId, actorUserId, entityType: "task_assignment", entityId: assignment.assignmentId, action: "completed", afterJson: { rewardStars: assignment.rewardStars } });
    return { assignmentId: assignment.assignmentId, alreadyCompleted: false };
  });
}
