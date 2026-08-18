type RuntimeDatabaseEnvironment = Record<string, string | undefined>;

/**
 * Resolve the application connection without silently falling back to an
 * owner URL when a least-privilege rollout has been explicitly enabled.
 */
export function resolveRuntimeDatabaseUrl(environment: RuntimeDatabaseEnvironment = process.env): string | undefined {
  const runtimeUrl = environment.DATABASE_URL_RUNTIME?.trim();
  if (runtimeUrl) return runtimeUrl;

  if (environment.REQUIRE_RUNTIME_ROLE === "true") {
    throw new Error("DATABASE_URL_RUNTIME is required when REQUIRE_RUNTIME_ROLE=true.");
  }

  return environment.DATABASE_URL?.trim() || undefined;
}
