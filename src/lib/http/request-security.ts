export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const allowedOrigins = new Set<string>([new URL(request.url).origin]);
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredAppUrl) {
    try {
      allowedOrigins.add(new URL(configuredAppUrl).origin);
    } catch {
      // Ignore malformed optional configuration and keep the request origin.
    }
  }
  return allowedOrigins.has(origin);
}

export function noStoreHeaders(): HeadersInit {
  return { "Cache-Control": "no-store" };
}
