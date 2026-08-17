import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { rewards, students, taskAssignments, tasks } from "@/db/schema";
import { getTeacherClass } from "@/lib/classroom/queries";

export async function getTeacherTaskBoard(userId: string, classId?: string) {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) return null;
  const [taskRows, assignmentRows] = await Promise.all([
    db.select({ id: tasks.id, title: tasks.title, description: tasks.description, rewardStars: tasks.rewardStars, status: tasks.status, startsAt: tasks.startsAt, dueAt: tasks.dueAt }).from(tasks).where(eq(tasks.classId, classContext.id)).orderBy(desc(tasks.dueAt)),
    db.select({ taskId: taskAssignments.taskId, studentId: taskAssignments.studentId, studentName: students.fullName, status: taskAssignments.status, completedAt: taskAssignments.completedAt }).from(taskAssignments).innerJoin(tasks, eq(tasks.id, taskAssignments.taskId)).innerJoin(students, eq(students.id, taskAssignments.studentId)).where(eq(tasks.classId, classContext.id)).orderBy(asc(students.fullName)),
  ]);
  return { classContext, tasks: taskRows, assignments: assignmentRows };
}

export async function getTeacherRewardBoard(userId: string, classId?: string) {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) return null;
  const rewardRows = await db.select({ id: rewards.id, name: rewards.name, description: rewards.description, rewardType: rewards.rewardType, costStars: rewards.costStars, stock: rewards.stock, active: rewards.active }).from(rewards).where(eq(rewards.classId, classContext.id)).orderBy(asc(rewards.costStars), asc(rewards.name));
  return { classContext, rewards: rewardRows };
}
