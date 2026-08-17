import { createNeonAuth } from "@neondatabase/auth/next/server";

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
