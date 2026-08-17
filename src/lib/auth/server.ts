import { createNeonAuth } from "@neondatabase/auth/next/server";
import { redirect } from "next/navigation";

import { hasValidAuthConfiguration } from "@/lib/auth/config";

const configuredBaseUrl = process.env.NEON_AUTH_BASE_URL?.trim();
const configuredCookieSecret = process.env.NEON_AUTH_COOKIE_SECRET?.trim();

export const authConfigured = hasValidAuthConfiguration(configuredBaseUrl, configuredCookieSecret);

// The disabled values only satisfy the SDK constructor. Every public auth
// entry point is guarded by `authConfigured`, so these values can never be
// used to authenticate a request. The secret is intentionally ephemeral and
// never predictable or shared between processes.
const disabledAuthCookieSecret = `${globalThis.crypto.randomUUID()}${globalThis.crypto.randomUUID()}`;

export const auth = createNeonAuth({
  baseUrl: configuredBaseUrl ?? "disabled://neon-auth",
  cookies: {
    secret: configuredCookieSecret ?? disabledAuthCookieSecret,
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
