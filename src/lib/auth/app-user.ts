import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type AuthenticatedUser = {
  id: string;
  email?: string | null;
  name?: string | null;
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

  const [user] = await db
    .insert(users)
    .values({
      id: authUser.id,
      email,
      displayName,
      status: "active",
    })
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email,
        displayName,
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
