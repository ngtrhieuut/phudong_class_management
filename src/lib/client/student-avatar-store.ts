import type { DemoStudent } from "@/lib/demo-data";

const STORAGE_KEY = "phudong.student-avatar-updates.v1";
const RECONCILIATION_TTL_MS = 30 * 60 * 1000;

type AvatarUpdate = { url: string; savedAt: number };
type AvatarUpdates = Record<string, AvatarUpdate>;

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
          return [[studentId, { url: value, savedAt: Date.now() }]];
        }
        if (!value || typeof value !== "object" || Array.isArray(value)) return [];
        const url = "url" in value && typeof value.url === "string" ? value.url : null;
        const savedAt = "savedAt" in value && typeof value.savedAt === "number" ? value.savedAt : null;
        return url && savedAt !== null ? [[studentId, { url, savedAt }]] : [];
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

export function rememberStudentAvatar(studentId: string, avatarUrl: string) {
  const updates = readUpdates();
  updates[studentId] = { url: avatarUrl, savedAt: Date.now() };
  writeUpdates(updates);
}

/**
 * Reconciles a server-rendered roster with a just-saved avatar while Next's
 * client router is still able to reuse an older RSC payload. A matching
 * server value clears the local update. A different server value is treated
 * as stale for a short, bounded window because App Router can return a
 * payload generated before the PATCH completed; after the window the server
 * becomes authoritative.
 */
export function applyStudentAvatarUpdates(students: readonly DemoStudent[]): DemoStudent[] {
  const updates = readUpdates();
  if (Object.keys(updates).length === 0) return [...students];

  let changed = false;
  const nextStudents = students.map((student) => {
    const update = updates[student.id];
    if (!update) return student;

    if (Date.now() - update.savedAt > RECONCILIATION_TTL_MS) {
      delete updates[student.id];
      changed = true;
      return student;
    }

    if (student.avatarUrl === update.url) {
      delete updates[student.id];
      changed = true;
      return student;
    }

    return { ...student, avatarUrl: update.url };
  });

  if (changed) writeUpdates(updates);
  return nextStudents;
}
