import { createHash } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  badgeDefinitions,
  behaviorTemplates,
  classMemberships,
  classRoles,
  classStudents,
  classes,
  levelDefinitions,
  organizationMembers,
  organizations,
  rewards,
  schoolYears,
  studentScoreSnapshots,
  students,
  users,
} from "@/db/schema";
import { isAvatarPresetUrl } from "@/lib/avatar-presets";

const studentSchema = z.object({
  studentCode: z.string().trim().min(1).max(50),
  fullName: z.string().trim().min(1).max(160),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u).nullable().optional(),
  gender: z.enum(["male", "female", "other", "undisclosed"]).nullable().optional(),
  seatNo: z.number().int().min(1).max(200).nullable().optional(),
  groupName: z.string().trim().max(80).nullable().optional(),
  avatarUrl: z.string().refine((value) => isAvatarPresetUrl(value), "Avatar không nằm trong preset được phép.").nullable().optional(),
});

const onboardingSchema = z.object({
  organizationId: z.string().uuid().optional(),
  organization: z.object({
    name: z.string().trim().min(1).max(160),
    code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/u).optional(),
  }),
  schoolYear: z.object({
    name: z.string().trim().min(1).max(80),
    startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
  }),
  classroom: z.object({
    name: z.string().trim().min(1).max(80),
    grade: z.number().int().min(1).max(5),
  }),
  students: z.array(studentSchema).max(200).default([]),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;

export class OnboardingError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "FORBIDDEN" | "CONFLICT",
    message: string,
  ) {
    super(message);
    this.name = "OnboardingError";
  }
}

const defaultBehaviors = [
  { name: "Phát biểu tự tin", category: "positive" as const, defaultPoints: 5, icon: "chat", dailyLimit: 3 },
  { name: "Giúp đỡ bạn bè", category: "positive" as const, defaultPoints: 3, icon: "heart", dailyLimit: 3 },
  { name: "Hoàn thành nhiệm vụ", category: "positive" as const, defaultPoints: 5, icon: "check", dailyLimit: 2 },
  { name: "Giữ gìn vệ sinh", category: "positive" as const, defaultPoints: 2, icon: "sparkle", dailyLimit: 2 },
  { name: "Cần cố gắng đúng giờ", category: "needs_improvement" as const, defaultPoints: -3, icon: "clock", dailyLimit: 2 },
];

const defaultLevels = [
  { name: "Mầm non", minScore: 0, maxScore: 19, sortOrder: 0 },
  { name: "Chồi xanh", minScore: 20, maxScore: 49, sortOrder: 1 },
  { name: "Cây khỏe", minScore: 50, maxScore: 99, sortOrder: 2 },
  { name: "Tán rộng", minScore: 100, maxScore: 199, sortOrder: 3 },
  { name: "Ngôi sao lớp học", minScore: 200, maxScore: null, sortOrder: 4 },
];

const defaultBadges = [
  { name: "Bàn tay sẻ chia", description: "Chủ động giúp đỡ bạn bè.", iconUrl: "/badges/helping.svg" },
  { name: "Siêu chăm học", description: "Bền bỉ hoàn thành nhiệm vụ.", iconUrl: "/badges/homework.svg" },
  { name: "Góc học tập xanh", description: "Giữ gìn lớp học sạch đẹp.", iconUrl: "/badges/clean.svg" },
];

const defaultRewards = [
  { name: "Chọn chỗ ngồi yêu thích", description: "Được chọn chỗ ngồi cho một tiết học.", rewardType: "privilege" as const, costStars: 20, stock: null },
  { name: "Chọn trò chơi cuối tiết", description: "Chọn một trò chơi ngắn cùng cả lớp.", rewardType: "activity" as const, costStars: 30, stock: 5 },
  { name: "Tuyên dương đặc biệt", description: "Một lời tuyên dương nổi bật trong tuần.", rewardType: "recognition" as const, costStars: 50, stock: null },
];

function dateAtUtc(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) throw new OnboardingError("INVALID_INPUT", "Ngày trong hồ sơ lớp không hợp lệ.");
  return date;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function generatedOrganizationCode(userId: string) {
  return `PHU-${createHash("sha256").update(userId).digest("hex").slice(0, 10).toUpperCase()}`;
}

export function parseTeacherOnboardingInput(input: unknown): OnboardingInput {
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) throw new OnboardingError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Thông tin khởi tạo lớp chưa hợp lệ.");
  return parsed.data;
}

async function seedClassConfiguration(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], classId: string, organizationId: string) {
  await tx.insert(classRoles).values([
    { classId, name: "Lớp trưởng", icon: "crown", sortOrder: 0 },
    { classId, name: "Lớp phó", icon: "star", sortOrder: 1 },
    { classId, name: "Tổ trưởng", icon: "users", sortOrder: 2 },
  ]).onConflictDoNothing();
  await tx.insert(behaviorTemplates).values(defaultBehaviors.map((behavior) => ({ ...behavior, classId, organizationId }))).onConflictDoNothing();
  await tx.insert(levelDefinitions).values(defaultLevels.map((level) => ({ ...level, classId }))).onConflictDoNothing();
  await tx.insert(badgeDefinitions).values(defaultBadges.map((badge) => ({ ...badge, classId, active: true }))).onConflictDoNothing();
  await tx.insert(rewards).values(defaultRewards.map((reward) => ({ ...reward, classId, active: true }))).onConflictDoNothing();
}

export async function getOnboardingState(userId: string) {
  const [membership] = await db
    .select({ organizationId: organizationMembers.organizationId, organizationName: organizations.name, role: organizationMembers.role })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.userId, userId), inArray(organizationMembers.role, ["admin", "teacher"]), eq(users.status, "active")))
    .limit(1);
  const [classContext] = membership
    ? await db.select({ id: classes.id, name: classes.name, grade: classes.grade, schoolYearName: schoolYears.name }).from(classMemberships).innerJoin(classes, eq(classes.id, classMemberships.classId)).innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId)).where(and(eq(classMemberships.userId, userId), eq(classes.organizationId, membership.organizationId), eq(schoolYears.active, true), sql`coalesce(${classes.settingsJson}->>'archived', 'false') <> 'true'`, inArray(classMemberships.role, ["homeroom_teacher", "teacher"]))).limit(1)
    : [];
  return { completed: Boolean(classContext), organization: membership ?? null, classContext: classContext ?? null };
}

export async function completeTeacherOnboarding(input: unknown, actorUserId: string) {
  const value = parseTeacherOnboardingInput(input);
  if (dateAtUtc(value.schoolYear.endsAt) <= dateAtUtc(value.schoolYear.startsAt)) throw new OnboardingError("INVALID_INPUT", "Ngày kết thúc năm học phải sau ngày bắt đầu.");

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:onboarding:${actorUserId}`}, 0))`);
    const [existingMembership] = await tx
      .select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(eq(organizationMembers.userId, actorUserId), inArray(organizationMembers.role, ["admin", "teacher"]), eq(users.status, "active")))
      .limit(1);

    let organizationId = existingMembership?.organizationId;
    let organizationCreated = false;
    if (value.organizationId) {
      const [requestedMembership] = await tx.select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, value.organizationId), eq(organizationMembers.userId, actorUserId), inArray(organizationMembers.role, ["admin", "teacher"]))).limit(1);
      if (!requestedMembership) throw new OnboardingError("FORBIDDEN", "Bạn không có quyền khởi tạo lớp trong tổ chức này.");
      organizationId = requestedMembership.organizationId;
    }
    if (!organizationId) {
      const code = normalizeCode(value.organization.code || generatedOrganizationCode(actorUserId));
      const [created] = await tx.insert(organizations).values({ name: value.organization.name, code }).onConflictDoNothing().returning({ id: organizations.id });
      if (!created) throw new OnboardingError("CONFLICT", "Mã tổ chức đã tồn tại. Hãy chọn mã khác.");
      organizationId = created.id;
      organizationCreated = true;
      await tx.insert(organizationMembers).values({ organizationId, userId: actorUserId, role: "admin" });
    } else if (existingMembership && existingMembership.role === "staff") {
      throw new OnboardingError("FORBIDDEN", "Tài khoản staff không thể khởi tạo lớp.");
    }

    const [year] = await tx.select({ id: schoolYears.id }).from(schoolYears).where(and(eq(schoolYears.organizationId, organizationId), eq(schoolYears.name, value.schoolYear.name))).limit(1);
    const schoolYear = year ?? (await tx.insert(schoolYears).values({ organizationId, name: value.schoolYear.name, startsAt: dateAtUtc(value.schoolYear.startsAt), endsAt: dateAtUtc(value.schoolYear.endsAt), active: true }).returning({ id: schoolYears.id }))[0];
    if (!schoolYear) throw new OnboardingError("CONFLICT", "Không thể tạo năm học.");
    await tx.update(schoolYears).set({ active: false, updatedAt: new Date() }).where(eq(schoolYears.organizationId, organizationId));
    await tx.update(schoolYears).set({ startsAt: dateAtUtc(value.schoolYear.startsAt), endsAt: dateAtUtc(value.schoolYear.endsAt), active: true, updatedAt: new Date() }).where(and(eq(schoolYears.id, schoolYear.id), eq(schoolYears.organizationId, organizationId)));

    const [existingClass] = await tx.select({ id: classes.id, settingsJson: classes.settingsJson }).from(classes).where(and(eq(classes.organizationId, organizationId), eq(classes.schoolYearId, schoolYear.id), eq(classes.name, value.classroom.name))).limit(1);
    const classRow = existingClass ?? (await tx.insert(classes).values({ organizationId, schoolYearId: schoolYear.id, name: value.classroom.name, grade: value.classroom.grade, homeroomTeacherId: actorUserId }).returning({ id: classes.id }))[0];
    if (!classRow) throw new OnboardingError("CONFLICT", "Không thể tạo lớp học.");
    await tx.update(classes).set({ grade: value.classroom.grade, homeroomTeacherId: actorUserId, settingsJson: { ...(existingClass?.settingsJson ?? {}), archived: false }, updatedAt: new Date() }).where(and(eq(classes.id, classRow.id), eq(classes.organizationId, organizationId), eq(classes.schoolYearId, schoolYear.id)));
    await tx.insert(classMemberships).values({ classId: classRow.id, userId: actorUserId, role: "homeroom_teacher" }).onConflictDoUpdate({ target: [classMemberships.classId, classMemberships.userId], set: { role: "homeroom_teacher", updatedAt: new Date() } });
    await seedClassConfiguration(tx, classRow.id, organizationId);

    const normalizedStudents = value.students.map((student) => ({ ...student, studentCode: normalizeCode(student.studentCode), birthDate: student.birthDate || null, gender: student.gender || "undisclosed" as const, seatNo: student.seatNo ?? null, groupName: student.groupName || null, avatarUrl: student.avatarUrl || null }));
    const codes = new Set<string>();
    for (const student of normalizedStudents) {
      if (codes.has(student.studentCode)) throw new OnboardingError("INVALID_INPUT", `Mã học sinh bị trùng: ${student.studentCode}`);
      codes.add(student.studentCode);
      await tx.insert(students).values({ organizationId, ...student }).onConflictDoNothing();
    }
    const studentRows = normalizedStudents.length ? await tx.select({ id: students.id, studentCode: students.studentCode }).from(students).where(and(eq(students.organizationId, organizationId), inArray(students.studentCode, normalizedStudents.map((student) => student.studentCode)))) : [];
    const studentByCode = new Map(studentRows.map((student) => [student.studentCode, student.id]));
    for (const student of normalizedStudents) {
      const studentId = studentByCode.get(student.studentCode);
      if (!studentId) continue;
      await tx.insert(classStudents).values({ classId: classRow.id, studentId, seatNo: student.seatNo, groupName: student.groupName }).onConflictDoNothing();
      await tx.insert(studentScoreSnapshots).values({ classId: classRow.id, studentId, lifetimeScore: 0, spendableStars: 0 }).onConflictDoNothing();
    }

    await tx.insert(auditLogs).values({ organizationId, actorUserId, entityType: "teacher_onboarding", entityId: classRow.id, action: "completed", afterJson: { organizationCreated, schoolYearId: schoolYear.id, classId: classRow.id, studentCount: normalizedStudents.length, presetsSeeded: true } });
    return { organizationId, schoolYearId: schoolYear.id, classId: classRow.id, studentCount: normalizedStudents.length };
  });
}
