import { describe, expect, it } from "vitest";

import { hasValidAuthConfiguration } from "@/lib/auth/config";

describe("Neon Auth configuration", () => {
  it("requires both an auth URL and a sufficiently long cookie secret", () => {
    expect(hasValidAuthConfiguration(undefined, undefined)).toBe(false);
    expect(hasValidAuthConfiguration("https://auth.example.test", "short-secret")).toBe(false);
    expect(hasValidAuthConfiguration("", "a".repeat(32))).toBe(false);
    expect(hasValidAuthConfiguration("https://auth.example.test", "a".repeat(31))).toBe(false);
    expect(hasValidAuthConfiguration("https://auth.example.test", "a".repeat(32))).toBe(true);
  });

  it("trims environment values before evaluating them", () => {
    expect(hasValidAuthConfiguration("  https://auth.example.test  ", ` ${"a".repeat(32)} `)).toBe(true);
  });
});
