import type { DemoStudent } from "@/lib/demo-data";

import { normalizeAvatarPresetUrl } from "@/lib/avatar-presets";

const STORAGE_KEY = "phudong.student-avatar-updates.v1";

type AvatarUpdate = { url: string | null; savedAt: number };
type AvatarUpdates = Record<string, AvatarUpdate>;

function normalizeAvatarUrl(value: string | null): string | null {
  return normalizeAvatarPresetUrl(value) ?? null;
}

function readUpdates(): AvatarUpdates {
  if (typeof window === "undefined") return {};

  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).flatMap(([studentId, value]) => {
        if (typeof value === "string") {
          // Keep compatibility with the first version of this store.
          return [[studentId, { url: normalizeAvatarUrl(value), savedAt: Date.now() }]];
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const url = "url" in value && (typeof value.url === "string" || value.url === null) ? normalizeAvatarUrl(value.url) : undefined;
        const savedAt = "savedAt" in value && typeof value.savedAt === "number" ? value.savedAt : null;
        return url !== undefined && savedAt !== null ? [[studentId, { url, savedAt }]] : [];
      }),
    ) as AvatarUpdates;
  } catch {
    return {};
  }
}

function writeUpdates(updates: AvatarUpdates) {
  if (typeof window === "undefined") return;

  try {
    if (Object.keys(updates).length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updates));
    }
  } catch {
    // sessionStorage can be unavailable in privacy-restricted browsers. The
    // server response remains the source of truth in that case.
  }
}

export function rememberStudentAvatar(studentId: string, avatarUrl: string | null) {
  const updates = readUpdates();
  updates[studentId] = { url: normalizeAvatarUrl(avatarUrl), savedAt: Date.now() };
  writeUpdates(updates);
}

/**
 * Applies the last known avatar to a server-rendered roster. Next's App
 * Router can reuse an older RSC payload after navigation, so an empty or old
 * value must not erase an avatar that was already confirmed by the API.
 *
 * The cache is deliberately confirmation-driven rather than TTL-driven. A
 * timer cannot tell whether a value is genuinely stale or whether the RSC
 * payload is stale. The no-store snapshot endpoint below is the authority
 * that refreshes this cache.
 */
export function applyStudentAvatarUpdates(students: readonly DemoStudent[]): DemoStudent[] {
  const updates = readUpdates();
  if (Object.keys(updates).length === 0) return [...students];

  return students.map((student) => {
    const update = updates[student.id];
    if (!update) return student;

    return student.avatarUrl === update.url ? student : { ...student, avatarUrl: update.url };
  });
}

/**
 * Applies a fresh no-store response from the database and stores that
 * response as the newest known value. Keeping the confirmed value locally is
 * what prevents a later stale RSC payload from rolling the UI back again.
 */
export function applyStudentAvatarSnapshots(
  students: readonly DemoStudent[],
  snapshots: readonly { id: string; avatarUrl: string | null }[],
): DemoStudent[] {
  if (snapshots.length === 0) return [...students];

  const updates = readUpdates();
  const avatarsByStudent = new Map(snapshots.map((snapshot) => [snapshot.id, snapshot.avatarUrl]));
  const now = Date.now();

  for (const snapshot of snapshots) {
    const avatarUrl = normalizeAvatarUrl(snapshot.avatarUrl);
    const current = updates[snapshot.id];
    if (!current || current.url !== avatarUrl) {
      updates[snapshot.id] = { url: avatarUrl, savedAt: now };
    }
  }
  writeUpdates(updates);

  return students.map((student) => {
    if (!avatarsByStudent.has(student.id)) return student;
    const avatarUrl = normalizeAvatarUrl(avatarsByStudent.get(student.id) ?? null);
    return student.avatarUrl === avatarUrl ? student : { ...student, avatarUrl };
  });
}
