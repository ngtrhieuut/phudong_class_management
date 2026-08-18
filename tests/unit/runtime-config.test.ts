import { describe, expect, it } from "vitest";

import { resolveRuntimeDatabaseUrl } from "@/lib/db/runtime-config";

describe("runtime database configuration", () => {
  it("prefers the least-privilege runtime connection", () => {
    expect(
      resolveRuntimeDatabaseUrl({
        DATABASE_URL_RUNTIME: " https://runtime.example/db ",
        DATABASE_URL: "https://owner.example/db",
        REQUIRE_RUNTIME_ROLE: "true",
      }),
    ).toBe("https://runtime.example/db");
  });

  it("fails closed when runtime-role enforcement is enabled without a runtime URL", () => {
    expect(() => resolveRuntimeDatabaseUrl({ DATABASE_URL: "https://owner.example/db", REQUIRE_RUNTIME_ROLE: "true" })).toThrow(
      "DATABASE_URL_RUNTIME is required when REQUIRE_RUNTIME_ROLE=true.",
    );
  });

  it("keeps the local/pilot fallback when enforcement is disabled", () => {
    expect(resolveRuntimeDatabaseUrl({ DATABASE_URL: " https://owner.example/db " })).toBe("https://owner.example/db");
  });
});
