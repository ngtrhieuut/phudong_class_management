export function hasValidAuthConfiguration(baseUrl?: string, cookieSecret?: string) {
  return Boolean(baseUrl?.trim() && cookieSecret?.trim() && cookieSecret.trim().length >= 32);
}
