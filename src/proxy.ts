import { NextRequest, NextResponse } from "next/server";
import { auth, authConfigured } from "@/lib/auth/server";

function contentSecurityPolicy(nonce: string) {
  const isDevelopment = process.env.NODE_ENV === "development";
  const connectSources = ["'self'", "https://*.neon.tech", "https://*.blob.vercel-storage.com"];
  if (process.env.NEON_AUTH_BASE_URL) {
    try {
      const authOrigin = new URL(process.env.NEON_AUTH_BASE_URL).origin;
      if (!connectSources.includes(authOrigin)) connectSources.push(authOrigin);
    } catch {
      // Invalid optional auth configuration is handled by the auth guard.
    }
  }

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'nonce-${nonce}'`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

const neonAuthMiddleware = auth.middleware({
  loginUrl: "/auth/sign-in",
});

function isProtectedPath(pathname: string) {
  return ["/teacher", "/parent", "/admin"].some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  // Next.js uses this request header to attach the nonce to its generated
  // scripts. The auth middleware still needs the original cookies and URL.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", policy);

  let response: NextResponse;

  if (!isProtectedPath(request.nextUrl.pathname)) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else if (!authConfigured) {
    const loginUrl = new URL("/auth/sign-in", request.url);
    loginUrl.searchParams.set("setup", "required");
    response = NextResponse.redirect(loginUrl);
  } else {
    response = await neonAuthMiddleware(request);
  }

  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest).*)",
  ],
};
