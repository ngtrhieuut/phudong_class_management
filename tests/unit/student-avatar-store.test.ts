import { afterEach, describe, expect, it, vi } from "vitest";

import type { DemoStudent } from "@/lib/demo-data";
import { applyStudentAvatarSnapshots, applyStudentAvatarUpdates, rememberStudentAvatar } from "@/lib/client/student-avatar-store";

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
    rememberStudentAvatar("student-1", "/avatars/male-01.webp");

    expect(applyStudentAvatarUpdates([makeStudent()])[0]?.avatarUrl).toBe("/avatars/male-01.webp");
  });

  it("migrates legacy PNG cache entries to the current WebP asset", () => {
    installSessionStorage();
    window.sessionStorage.setItem("phudong.student-avatar-updates.v1", JSON.stringify({ "student-1": "/avatars/male-01.png" }));

    expect(applyStudentAvatarUpdates([makeStudent()])[0]?.avatarUrl).toBe("/avatars/male-01.webp");
  });

  it("does not let a stale non-null RSC value erase a just-saved avatar", () => {
    installSessionStorage();
    rememberStudentAvatar("student-1", "/avatars/male-01.webp");

    expect(applyStudentAvatarUpdates([makeStudent("/avatars/female-02.webp")])[0]?.avatarUrl).toBe("/avatars/male-01.webp");
  });

  it("keeps the confirmed value when a later RSC payload is stale", () => {
    installSessionStorage();
    rememberStudentAvatar("student-1", "/avatars/male-01.webp");

    expect(applyStudentAvatarSnapshots([makeStudent()], [{ id: "student-1", avatarUrl: "/avatars/male-01.webp" }])[0]?.avatarUrl).toBe("/avatars/male-01.webp");
    expect(applyStudentAvatarUpdates([makeStudent()])[0]?.avatarUrl).toBe("/avatars/male-01.webp");
  });

  it("accepts a newer database snapshot and keeps it across stale RSC data", () => {
    installSessionStorage();
    rememberStudentAvatar("student-1", "/avatars/male-01.webp");

    expect(applyStudentAvatarSnapshots([makeStudent()], [{ id: "student-1", avatarUrl: "/avatars/female-02.webp" }])[0]?.avatarUrl).toBe("/avatars/female-02.webp");
    expect(applyStudentAvatarUpdates([makeStudent()])[0]?.avatarUrl).toBe("/avatars/female-02.webp");
  });

  it("allows a fresh database snapshot to confirm that an avatar was cleared", () => {
    installSessionStorage();
    rememberStudentAvatar("student-1", "/avatars/male-01.webp");

    expect(applyStudentAvatarSnapshots([makeStudent("/avatars/male-01.webp")], [{ id: "student-1", avatarUrl: null }])[0]?.avatarUrl).toBeNull();
    expect(applyStudentAvatarUpdates([makeStudent("/avatars/male-01.webp")])[0]?.avatarUrl).toBeNull();
  });
});
