import { describe, expect, it } from "vitest";

import { avatarPresets, isAvatarPresetUrl } from "@/lib/avatar-presets";

describe("avatar presets", () => {
  it("provides five male and five female local icon templates", () => {
    expect(avatarPresets).toHaveLength(10);
    expect(avatarPresets.filter((preset) => preset.gender === "male")).toHaveLength(5);
    expect(avatarPresets.filter((preset) => preset.gender === "female")).toHaveLength(5);
    expect(avatarPresets.every((preset) => preset.url.startsWith("/avatars/") && preset.url.endsWith(".png"))).toBe(true);
  });

  it("rejects remote or unknown avatar URLs", () => {
    expect(isAvatarPresetUrl("/avatars/male-01.png")).toBe(true);
    expect(isAvatarPresetUrl("https://example.com/avatar.png")).toBe(false);
    expect(isAvatarPresetUrl("/avatars/unknown.png")).toBe(false);
  });
});
