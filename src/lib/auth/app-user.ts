import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { classMemberships, organizationMembers, users } from "@/db/schema";
import { isAvatarPresetUrl } from "@/lib/avatar-presets";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
};

/**
 * Keep the application user projection in sync with the Neon Auth identity.
 * This is intentionally limited to the authenticated user's own row.
 */
export async function ensureAppUser(authUser: AuthenticatedUser) {
  if (!uuidPattern.test(authUser.id)) {
    throw new Error("The authenticated Neon user id is not a UUID.");
  }

  const displayName = authUser.name?.trim() || authUser.email?.trim() || "Người dùng Phù Đổng";
  const email = authUser.email?.trim().toLowerCase() || null;
  const image = authUser.image === undefined ? undefined : authUser.image?.trim() || null;
  const avatarUrl = image === null || (image && isAvatarPresetUrl(image)) ? image : undefined;

  // An admin invitation creates a local placeholder user before the person
  // creates a Neon Auth identity. Claim that placeholder exactly once when the
  // matching email signs in, while preserving tenant memberships.
  if (email) {
    const [invitedUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.email, email), eq(users.status, "invited")))
      .limit(1);
    if (invitedUser && invitedUser.id !== authUser.id) {
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id: authUser.id, email, displayName, avatarUrl: avatarUrl ?? null, status: "active" }).onConflictDoNothing();
        const organizationRows = await tx.select({ organizationId: organizationMembers.organizationId, role: organizationMembers.role }).from(organizationMembers).where(eq(organizationMembers.userId, invitedUser.id));
        for (const row of organizationRows) {
          await tx.insert(organizationMembers).values({ organizationId: row.organizationId, userId: authUser.id, role: row.role }).onConflictDoNothing();
        }
        await tx.delete(organizationMembers).where(eq(organizationMembers.userId, invitedUser.id));
        const classRows = await tx.select({ classId: classMemberships.classId, role: classMemberships.role }).from(classMemberships).where(eq(classMemberships.userId, invitedUser.id));
        for (const row of classRows) {
          await tx.insert(classMemberships).values({ classId: row.classId, userId: authUser.id, role: row.role }).onConflictDoNothing();
        }
        await tx.delete(classMemberships).where(eq(classMemberships.userId, invitedUser.id));
        await tx.delete(users).where(eq(users.id, invitedUser.id));
      });
    }
  }

  const [user] = await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      displayName,
      avatarUrl: avatarUrl ?? null,
      status: "active",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        displayName,
        ...(avatarUrl !== undefined ? { avatarUrl } : {}),
        updatedAt: new Date(),
      },
    })
    .returning();

  if (!user || user.status !== "active") {
    throw new Error("The application user is not active.");
  }

  return user;
}

export async function getAppUserById(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}
