export function isSameOrigin(request: Request): boolean {
  const allowedOrigins = new Set<string>([new URL(request.url).origin]);
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      allowedOrigins.add(new URL(configuredAppUrl).origin);
    } catch {
      // Ignore malformed optional configuration and keep the request origin.
    }
  }

  const origin = request.headers.get("origin")?.trim();
  if (origin) {
    return allowedOrigins.has(parseOrigin(origin));
  }

  const referer = request.headers.get("referer")?.trim();
  if (referer) {
    try {
      return allowedOrigins.has(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  // Browser mutation requests normally carry Origin or Referer. Fail closed
  // when both are absent, while keeping safe read-only requests usable by
  // health checks and server-to-server monitors.
  return request.method === "GET" || request.method === "HEAD" || request.method === "OPTIONS";
}

function parseOrigin(value: string): string {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function noStoreHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
    "X-Content-Type-Options": "nosniff",
  };
}
