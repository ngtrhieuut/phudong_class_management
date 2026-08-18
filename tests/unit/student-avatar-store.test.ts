import { afterEach, describe, expect, it, vi } from "vitest";

import type { DemoStudent } from "@/lib/demo-data";
import { applyStudentAvatarUpdates, rememberStudentAvatar } from "@/lib/client/student-avatar-store";

function makeStudent(avatarUrl: string | null = null): DemoStudent {
  return { id: "student-1", avatarUrl } as DemoStudent;
}

function installSessionStorage() {
  const values = new Map<string, string>();
  const sessionStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  vi.stubGlobal("window", { sessionStorage });
}

afterEach(() => vi.unstubAllGlobals());

describe("student avatar client reconciliation", () => {
  it("keeps a just-saved avatar when the router returns a stale null value", () => {
    installSessionStorage();
    rememberStudentAvatar("student-1", "/avatars/male-01.png");

    expect(applyStudentAvatarUpdates([makeStudent()])[0]?.avatarUrl).toBe("/avatars/male-01.png");
  });

  it("lets a newer server value replace the local fallback", () => {
    installSessionStorage();
    rememberStudentAvatar("student-1", "/avatars/male-01.png");

    expect(applyStudentAvatarUpdates([makeStudent("/avatars/female-02.png")])[0]?.avatarUrl).toBe("/avatars/female-02.png");
    expect(applyStudentAvatarUpdates([makeStudent()])[0]?.avatarUrl).toBeNull();
  });
});
