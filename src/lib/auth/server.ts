import { createNeonAuth } from "@neondatabase/auth/next/server";
import { redirect } from "next/navigation";

const baseUrl = process.env.NEON_AUTH_BASE_URL ?? "http://127.0.0.1:3999/auth";
const cookieSecret =
  process.env.NEON_AUTH_COOKIE_SECRET ??
  "local-build-only-cookie-secret-change-before-use";

export const authConfigured = Boolean(
  process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET,
);

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
  },
  logLevel: authConfigured ? "warn" : "silent",
});

export async function getUserSession() {
  if (!authConfigured) {
    return null;
  }

  const { data: session } = await auth.getSession();
  return session?.user ? session : null;
}

/**
 * Server-component guard for application routes.
 *
 * Proxy is an optimistic early check; the actual page must still verify the
 * session server-side before rendering any class or student data.
 */
export async function requireUserSession() {
  if (!authConfigured) {
    redirect("/auth/sign-in?setup=required");
  }

  const session = await getUserSession();
  if (!session) {
    redirect("/auth/sign-in");
  }

  return session;
}
