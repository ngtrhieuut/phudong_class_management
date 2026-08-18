import { describe, expect, it } from "vitest";

import { isSameOrigin, noStoreHeaders } from "@/lib/http/request-security";

describe("request security", () => {
  it("accepts a same-origin Origin header", () => {
    const request = new Request("https://class.example.com/api/action", {
      method: "POST",
      headers: { Origin: "https://class.example.com" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it("accepts a same-origin Referer when Origin is absent", () => {
    const request = new Request("https://class.example.com/api/action", {
      method: "POST",
      headers: { Referer: "https://class.example.com/teacher/dashboard" },
    });
    expect(isSameOrigin(request)).toBe(true);
  });

  it("rejects cross-origin or headerless mutations", () => {
    expect(isSameOrigin(new Request("https://class.example.com/api/action", { method: "POST", headers: { Origin: "https://evil.example" } }))).toBe(false);
    expect(isSameOrigin(new Request("https://class.example.com/api/action", { method: "POST" }))).toBe(false);
  });

  it("keeps read-only probes usable without browser provenance headers", () => {
    expect(isSameOrigin(new Request("https://class.example.com/api/health", { method: "GET" }))).toBe(true);
    expect(noStoreHeaders()).toMatchObject({ "Cache-Control": "no-store", Pragma: "no-cache" });
  });
});
