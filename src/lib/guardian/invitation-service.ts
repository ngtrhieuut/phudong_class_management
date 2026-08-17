import { createHash, randomBytes } from "node:crypto";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLogs,
  classes,
  classMemberships,
  classStudents,
  guardianInvitations,
  guardians,
  studentGuardians,
  students,
  users,
} from "@/db/schema";

const writeRoles = ["homeroom_teacher", "teacher"] as const;

const createInvitationSchema = z.object({
  classId: z.string().uuid(),
  studentId: z.string().uuid(),
  guardianEmail: z.string().trim().email().max(320),
  relationship: z.string().trim().min(1).max(100),
  canView: z.boolean().default(true),
  receivesNotifications: z.boolean().default(true),
  expiresInHours: z.number().int().min(1).max(168).default(72),
});

const acceptInvitationSchema = z.object({
  token: z.string().trim().min(32).max(256),
});

export class GuardianInvitationError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "FORBIDDEN_CLASS_ACCESS"
      | "STUDENT_NOT_IN_CLASS"
      | "INVITATION_NOT_VALID",
    message: string,
  ) {
    super(message);
    this.name = "GuardianInvitationError";
  }
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function hashToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

async function getWritableClass(tx: Transaction, actorUserId: string, classId: string) {
  const [access] = await tx
    .select({ organizationId: classes.organizationId })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .where(
      and(
        eq(classMemberships.userId, actorUserId),
        eq(classMemberships.classId, classId),
        inArray(classMemberships.role, writeRoles),
        eq(users.status, "active"),
      ),
    )
    .limit(1);
  return access ?? null;
}

async function getActiveStudent(tx: Transaction, classId: string, studentId: string) {
  const [student] = await tx
    .select({ id: students.id, fullName: students.fullName })
    .from(classStudents)
    .innerJoin(students, eq(students.id, classStudents.studentId))
    .where(
      and(
        eq(classStudents.classId, classId),
        eq(classStudents.studentId, studentId),
        isNull(classStudents.leftAt),
        eq(students.status, "active"),
      ),
    )
    .limit(1);
  return student ?? null;
}

export async function createGuardianInvitation(input: unknown, actorUserId: string, appUrl: string) {
  const parsed = createInvitationSchema.safeParse(input);
  if (!parsed.success) {
    throw new GuardianInvitationError("INVALID_INPUT", "Dữ liệu lời mời phụ huynh không hợp lệ.");
  }

  const normalizedEmail = parsed.data.guardianEmail.toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.data.expiresInHours * 60 * 60 * 1000);

  return db.transaction(async (tx) => {
    const access = await getWritableClass(tx, actorUserId, parsed.data.classId);
    if (!access) {
      throw new GuardianInvitationError("FORBIDDEN_CLASS_ACCESS", "Bạn không có quyền tạo lời mời cho lớp này.");
    }

    const student = await getActiveStudent(tx, parsed.data.classId, parsed.data.studentId);
    if (!student) {
      throw new GuardianInvitationError("STUDENT_NOT_IN_CLASS", "Học sinh không thuộc lớp đang chọn.");
    }

    await tx
      .update(guardianInvitations)
      .set({ status: "revoked", revokedAt: now, updatedAt: now })
      .where(
        and(
          eq(guardianInvitations.classId, parsed.data.classId),
          eq(guardianInvitations.studentId, parsed.data.studentId),
          eq(guardianInvitations.guardianEmail, normalizedEmail),
          eq(guardianInvitations.status, "pending"),
        ),
      );

    const [invitation] = await tx
      .insert(guardianInvitations)
      .values({
        organizationId: access.organizationId,
        classId: parsed.data.classId,
        studentId: parsed.data.studentId,
        createdByUserId: actorUserId,
        guardianEmail: normalizedEmail,
        relationship: parsed.data.relationship,
        tokenHash,
        canView: parsed.data.canView,
        receivesNotifications: parsed.data.receivesNotifications,
        expiresAt,
      })
      .returning({ id: guardianInvitations.id, expiresAt: guardianInvitations.expiresAt });

    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorUserId,
      entityType: "guardian_invitation",
      entityId: invitation.id,
      action: "created",
      afterJson: {
        classId: parsed.data.classId,
        studentId: parsed.data.studentId,
        guardianEmail: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      id: invitation.id,
      expiresAt: invitation.expiresAt,
      inviteUrl: new URL(`/parent/invite?token=${encodeURIComponent(token)}`, appUrl).toString(),
    };
  });
}

export async function acceptGuardianInvitation(
  input: unknown,
  actor: { userId: string; email: string | null; displayName: string },
) {
  const parsed = acceptInvitationSchema.safeParse(input);
  const normalizedEmail = actor.email?.trim().toLowerCase();
  if (!parsed.success || !normalizedEmail) {
    throw new GuardianInvitationError("INVALID_INPUT", "Lời mời phụ huynh không hợp lệ.");
  }

  const tokenHash = hashToken(parsed.data.token);
  const now = new Date();

  return db.transaction(async (tx) => {
    const [invitation] = await tx
      .select({
        id: guardianInvitations.id,
        organizationId: guardianInvitations.organizationId,
        classId: guardianInvitations.classId,
        studentId: guardianInvitations.studentId,
        guardianEmail: guardianInvitations.guardianEmail,
        relationship: guardianInvitations.relationship,
        canView: guardianInvitations.canView,
        receivesNotifications: guardianInvitations.receivesNotifications,
        status: guardianInvitations.status,
        expiresAt: guardianInvitations.expiresAt,
        studentName: students.fullName,
        className: classes.name,
      })
      .from(guardianInvitations)
      .innerJoin(students, eq(students.id, guardianInvitations.studentId))
      .innerJoin(classes, eq(classes.id, guardianInvitations.classId))
      .where(eq(guardianInvitations.tokenHash, tokenHash))
      .limit(1);

    if (!invitation || invitation.status !== "pending" || invitation.guardianEmail !== normalizedEmail) {
      throw new GuardianInvitationError("INVITATION_NOT_VALID", "Lời mời không hợp lệ hoặc không dành cho tài khoản này.");
    }

    if (invitation.expiresAt <= now) {
      await tx
        .update(guardianInvitations)
        .set({ status: "expired", updatedAt: now })
        .where(eq(guardianInvitations.id, invitation.id));
      throw new GuardianInvitationError("INVITATION_NOT_VALID", "Lời mời phụ huynh đã hết hạn.");
    }

    const [existingGuardian] = await tx
      .select({ id: guardians.id })
      .from(guardians)
      .where(eq(guardians.userId, actor.userId))
      .limit(1);

    let guardianId: string;
    if (existingGuardian) {
      guardianId = existingGuardian.id;
      await tx
        .update(guardians)
        .set({ fullName: actor.displayName, email: normalizedEmail, updatedAt: now })
        .where(eq(guardians.id, guardianId));
    } else {
      const [createdGuardian] = await tx
        .insert(guardians)
        .values({ userId: actor.userId, fullName: actor.displayName, email: normalizedEmail })
        .returning({ id: guardians.id });
      guardianId = createdGuardian.id;
    }

    const [existingRelation] = await tx
      .select({ id: studentGuardians.id })
      .from(studentGuardians)
      .where(and(eq(studentGuardians.studentId, invitation.studentId), eq(studentGuardians.guardianId, guardianId)))
      .limit(1);

    if (existingRelation) {
      await tx
        .update(studentGuardians)
        .set({
          relationship: invitation.relationship,
          canView: invitation.canView,
          receivesNotifications: invitation.receivesNotifications,
          updatedAt: now,
        })
        .where(eq(studentGuardians.id, existingRelation.id));
    } else {
      await tx.insert(studentGuardians).values({
        studentId: invitation.studentId,
        guardianId,
        relationship: invitation.relationship,
        canView: invitation.canView,
        receivesNotifications: invitation.receivesNotifications,
      });
    }

    await tx
      .update(guardianInvitations)
      .set({ status: "accepted", acceptedByUserId: actor.userId, acceptedAt: now, updatedAt: now })
      .where(and(eq(guardianInvitations.id, invitation.id), eq(guardianInvitations.status, "pending")));

    await tx.insert(auditLogs).values([
      {
        organizationId: invitation.organizationId,
        actorUserId: actor.userId,
        entityType: "guardian_invitation",
        entityId: invitation.id,
        action: "accepted",
        afterJson: { studentId: invitation.studentId, guardianId },
      },
      {
        organizationId: invitation.organizationId,
        actorUserId: actor.userId,
        entityType: "student_guardian",
        entityId: `${invitation.studentId}:${guardianId}`,
        action: existingRelation ? "updated" : "linked",
        afterJson: {
          studentId: invitation.studentId,
          guardianId,
          canView: invitation.canView,
          receivesNotifications: invitation.receivesNotifications,
        },
      },
    ]);

    return {
      invitationId: invitation.id,
      studentId: invitation.studentId,
      studentName: invitation.studentName,
      className: invitation.className,
      linked: true,
    };
  });
}
