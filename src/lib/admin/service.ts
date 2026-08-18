import { createHash, randomUUID } from "node:crypto";

import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLogs, badgeDefinitions, behaviorTemplates, classMemberships, classes, organizationMembers, organizations, rewards, schoolYears, users } from "@/db/schema";

const organizationId = z.string().uuid();
const base = { organizationId };

const adminActionSchema = z.discriminatedUnion("action", [
  z.object({ ...base, action: z.literal("organization.update"), name: z.string().trim().min(1).max(160), code: z.string().trim().min(2).max(40).regex(/^[A-Za-z0-9_-]+$/u) }),
  z.object({ ...base, action: z.literal("school-year.save"), id: z.string().uuid().optional(), name: z.string().trim().min(1).max(80), startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u), endsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u), active: z.boolean().default(false) }),
  z.object({ ...base, action: z.literal("class.save"), id: z.string().uuid().optional(), schoolYearId: z.string().uuid(), name: z.string().trim().min(1).max(80), grade: z.number().int().min(1).max(12), teacherId: z.string().uuid().nullable().optional(), archived: z.boolean().default(false) }),
  z.object({ ...base, action: z.literal("member.invite"), email: z.string().trim().email().max(320), displayName: z.string().trim().min(1).max(160).optional(), role: z.enum(["admin", "teacher", "staff"]) }),
  z.object({ ...base, action: z.literal("member.role"), userId: z.string().uuid(), role: z.enum(["admin", "teacher", "staff"]) }),
  z.object({ ...base, action: z.literal("member.revoke"), userId: z.string().uuid(), confirmation: z.literal("REVOKE") }),
  z.object({ ...base, action: z.literal("behavior.save"), id: z.string().uuid().optional(), classId: z.string().uuid(), name: z.string().trim().min(1).max(120), category: z.enum(["positive", "needs_improvement"]), defaultPoints: z.number().int().min(-100).max(100), active: z.boolean().default(true) }),
  z.object({ ...base, action: z.literal("badge.save"), id: z.string().uuid().optional(), classId: z.string().uuid(), name: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(500), active: z.boolean().default(true) }),
  z.object({ ...base, action: z.literal("reward.save"), id: z.string().uuid().optional(), classId: z.string().uuid(), name: z.string().trim().min(1).max(120), description: z.string().trim().min(1).max(500), costStars: z.number().int().min(1).max(100000), stock: z.number().int().min(0).max(100000).nullable().optional(), active: z.boolean().default(true) }),
]);

export type AdminAction = z.infer<typeof adminActionSchema>;

export class AdminServiceError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT", message: string) {
    super(message);
    this.name = "AdminServiceError";
  }
}

function dateAtUtc(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.valueOf())) throw new AdminServiceError("INVALID_INPUT", "Ngày không hợp lệ.");
  return date;
}

async function assertAdmin(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], actorUserId: string, organizationIdValue: string) {
  const [membership] = await tx.select({ id: organizationMembers.id }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(eq(organizationMembers.organizationId, organizationIdValue), eq(organizationMembers.userId, actorUserId), eq(organizationMembers.role, "admin"), eq(users.status, "active"))).limit(1);
  if (!membership) throw new AdminServiceError("FORBIDDEN", "Bạn không có quyền quản trị tổ chức này.");
}

async function assertClassInOrganization(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], classId: string, organizationIdValue: string) {
  const [row] = await tx.select({ id: classes.id }).from(classes).where(and(eq(classes.id, classId), eq(classes.organizationId, organizationIdValue))).limit(1);
  if (!row) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy lớp trong tổ chức.");
}

async function audit(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], actorUserId: string, organizationIdValue: string, entityType: string, entityId: string, action: string, afterJson: Record<string, unknown>) {
  await tx.insert(auditLogs).values({ organizationId: organizationIdValue, actorUserId, entityType, entityId, action, afterJson });
}

export async function executeAdminAction(input: unknown, actorUserId: string) {
  const parsed = adminActionSchema.safeParse(input);
  if (!parsed.success) throw new AdminServiceError("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Thao tác quản trị không hợp lệ.");
  const action = parsed.data;
  return db.transaction(async (tx) => {
    await assertAdmin(tx, actorUserId, action.organizationId);
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`phudong:admin:${action.organizationId}`}, 0))`);

    if (action.action === "organization.update") {
      const [updated] = await tx.update(organizations).set({ name: action.name, code: action.code, updatedAt: new Date() }).where(eq(organizations.id, action.organizationId)).returning({ id: organizations.id });
      if (!updated) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy tổ chức.");
      await audit(tx, actorUserId, action.organizationId, "organization", updated.id, "updated", { fields: ["name", "code"] });
      return { id: updated.id };
    }

    if (action.action === "school-year.save") {
      if (dateAtUtc(action.endsAt) <= dateAtUtc(action.startsAt)) throw new AdminServiceError("INVALID_INPUT", "Ngày kết thúc năm học phải sau ngày bắt đầu.");
      if (action.active) await tx.update(schoolYears).set({ active: false, updatedAt: new Date() }).where(eq(schoolYears.organizationId, action.organizationId));
      const [saved] = action.id
        ? await tx.update(schoolYears).set({ name: action.name, startsAt: dateAtUtc(action.startsAt), endsAt: dateAtUtc(action.endsAt), active: action.active, updatedAt: new Date() }).where(and(eq(schoolYears.id, action.id), eq(schoolYears.organizationId, action.organizationId))).returning({ id: schoolYears.id })
        : await tx.insert(schoolYears).values({ organizationId: action.organizationId, name: action.name, startsAt: dateAtUtc(action.startsAt), endsAt: dateAtUtc(action.endsAt), active: action.active }).returning({ id: schoolYears.id });
      if (!saved) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy năm học.");
      await audit(tx, actorUserId, action.organizationId, "school_year", saved.id, action.id ? "updated" : "created", { active: action.active });
      return { id: saved.id };
    }

    if (action.action === "class.save") {
      const [year] = await tx.select({ id: schoolYears.id }).from(schoolYears).where(and(eq(schoolYears.id, action.schoolYearId), eq(schoolYears.organizationId, action.organizationId))).limit(1);
      if (!year) throw new AdminServiceError("NOT_FOUND", "Năm học không thuộc tổ chức.");
      if (action.teacherId) {
        const [teacher] = await tx.select({ id: organizationMembers.userId }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(eq(organizationMembers.organizationId, action.organizationId), eq(organizationMembers.userId, action.teacherId), inArray(organizationMembers.role, ["admin", "teacher", "staff"]), eq(users.status, "active"))).limit(1);
        if (!teacher) throw new AdminServiceError("INVALID_INPUT", "Giáo viên không thuộc tổ chức hoặc không active.");
      }
      const [existing] = action.id ? await tx.select({ settingsJson: classes.settingsJson }).from(classes).where(and(eq(classes.id, action.id), eq(classes.organizationId, action.organizationId))).limit(1) : [];
      const settingsJson = { ...(existing?.settingsJson ?? {}), archived: action.archived };
      const [saved] = action.id
        ? await tx.update(classes).set({ schoolYearId: action.schoolYearId, name: action.name, grade: action.grade, homeroomTeacherId: action.teacherId ?? null, settingsJson, updatedAt: new Date() }).where(and(eq(classes.id, action.id), eq(classes.organizationId, action.organizationId))).returning({ id: classes.id })
        : await tx.insert(classes).values({ organizationId: action.organizationId, schoolYearId: action.schoolYearId, name: action.name, grade: action.grade, homeroomTeacherId: action.teacherId ?? null, settingsJson }).returning({ id: classes.id });
      if (!saved) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy lớp.");
      if (action.teacherId) await tx.insert(classMemberships).values({ classId: saved.id, userId: action.teacherId, role: "homeroom_teacher" }).onConflictDoUpdate({ target: [classMemberships.classId, classMemberships.userId], set: { role: "homeroom_teacher", updatedAt: new Date() } });
      await audit(tx, actorUserId, action.organizationId, "class", saved.id, action.archived ? "archived" : action.id ? "updated" : "created", { grade: action.grade, teacherAssigned: Boolean(action.teacherId) });
      return { id: saved.id };
    }

    if (action.action === "member.invite") {
      const email = action.email.toLowerCase();
      const [existingUser] = await tx.select({ id: users.id, status: users.status }).from(users).where(eq(users.email, email)).limit(1);
      const invitedUserId = existingUser?.id ?? randomUUID();
      if (!existingUser) await tx.insert(users).values({ id: invitedUserId, email, displayName: action.displayName || email, status: "invited" });
      const [existingMember] = await tx.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, action.organizationId), eq(organizationMembers.userId, invitedUserId))).limit(1);
      if (existingMember) throw new AdminServiceError("CONFLICT", "Email này đã là thành viên của tổ chức.");
      await tx.insert(organizationMembers).values({ organizationId: action.organizationId, userId: invitedUserId, role: action.role });
      await audit(tx, actorUserId, action.organizationId, "organization_member", invitedUserId, "invited", { emailHash: createHash("sha256").update(email).digest("hex"), role: action.role, existingAccount: Boolean(existingUser) });
      return { id: invitedUserId, status: existingUser?.status ?? "invited" };
    }

    if (action.action === "member.role") {
      const [member] = await tx.select({ id: organizationMembers.id, role: organizationMembers.role }).from(organizationMembers).innerJoin(users, eq(users.id, organizationMembers.userId)).where(and(eq(organizationMembers.organizationId, action.organizationId), eq(organizationMembers.userId, action.userId), eq(users.status, "active"))).limit(1);
      if (!member) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy thành viên.");
      if (member.role === "admin" && action.role !== "admin") {
        const admins = await tx.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, action.organizationId), eq(organizationMembers.role, "admin")));
        if (admins.length < 2) throw new AdminServiceError("CONFLICT", "Không thể hạ quyền admin cuối cùng của tổ chức.");
      }
      await tx.update(organizationMembers).set({ role: action.role, updatedAt: new Date() }).where(eq(organizationMembers.id, member.id));
      await audit(tx, actorUserId, action.organizationId, "organization_member", action.userId, "role_updated", { role: action.role });
      return { id: action.userId };
    }

    if (action.action === "member.revoke") {
      const [member] = await tx.select({ id: organizationMembers.id, role: organizationMembers.role }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, action.organizationId), eq(organizationMembers.userId, action.userId))).limit(1);
      if (!member) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy thành viên.");
      if (member.role === "admin") {
        const admins = await tx.select({ id: organizationMembers.id }).from(organizationMembers).where(and(eq(organizationMembers.organizationId, action.organizationId), eq(organizationMembers.role, "admin")));
        if (admins.length < 2) throw new AdminServiceError("CONFLICT", "Không thể thu hồi admin cuối cùng của tổ chức.");
      }
      const orgClasses = await tx.select({ id: classes.id }).from(classes).where(eq(classes.organizationId, action.organizationId));
      if (orgClasses.length) await tx.delete(classMemberships).where(and(eq(classMemberships.userId, action.userId), inArray(classMemberships.classId, orgClasses.map((item) => item.id))));
      await tx.delete(organizationMembers).where(eq(organizationMembers.id, member.id));
      await audit(tx, actorUserId, action.organizationId, "organization_member", action.userId, "revoked", { classMembershipsRemoved: orgClasses.length });
      return { id: action.userId };
    }

    await assertClassInOrganization(tx, action.classId, action.organizationId);
    if (action.action === "behavior.save") {
      if ((action.category === "positive" && action.defaultPoints <= 0) || (action.category === "needs_improvement" && action.defaultPoints >= 0)) throw new AdminServiceError("INVALID_INPUT", "Điểm phải phù hợp với loại hành vi.");
      const [saved] = action.id ? await tx.update(behaviorTemplates).set({ name: action.name, category: action.category, defaultPoints: action.defaultPoints, active: action.active, updatedAt: new Date() }).where(and(eq(behaviorTemplates.id, action.id), eq(behaviorTemplates.classId, action.classId), eq(behaviorTemplates.organizationId, action.organizationId))).returning({ id: behaviorTemplates.id }) : await tx.insert(behaviorTemplates).values({ organizationId: action.organizationId, classId: action.classId, name: action.name, category: action.category, defaultPoints: action.defaultPoints, active: action.active }).returning({ id: behaviorTemplates.id });
      if (!saved) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy behavior template.");
      await audit(tx, actorUserId, action.organizationId, "behavior_template", saved.id, action.id ? "updated" : "created", { active: action.active });
      return { id: saved.id };
    }
    if (action.action === "badge.save") {
      const [saved] = action.id ? await tx.update(badgeDefinitions).set({ name: action.name, description: action.description, active: action.active, updatedAt: new Date() }).where(and(eq(badgeDefinitions.id, action.id), eq(badgeDefinitions.classId, action.classId))).returning({ id: badgeDefinitions.id }) : await tx.insert(badgeDefinitions).values({ classId: action.classId, name: action.name, description: action.description, active: action.active }).returning({ id: badgeDefinitions.id });
      if (!saved) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy badge definition.");
      await audit(tx, actorUserId, action.organizationId, "badge_definition", saved.id, action.id ? "updated" : "created", { active: action.active });
      return { id: saved.id };
    }
    const [saved] = action.id ? await tx.update(rewards).set({ name: action.name, description: action.description, costStars: action.costStars, stock: action.stock ?? null, active: action.active, updatedAt: new Date() }).where(and(eq(rewards.id, action.id), eq(rewards.classId, action.classId))).returning({ id: rewards.id }) : await tx.insert(rewards).values({ classId: action.classId, name: action.name, description: action.description, rewardType: "recognition", costStars: action.costStars, stock: action.stock ?? null, active: action.active }).returning({ id: rewards.id });
    if (!saved) throw new AdminServiceError("NOT_FOUND", "Không tìm thấy reward.");
    await audit(tx, actorUserId, action.organizationId, "reward", saved.id, action.id ? "updated" : "created", { active: action.active, costStars: action.costStars });
    return { id: saved.id };
  });
}
