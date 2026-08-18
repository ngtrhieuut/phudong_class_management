import type { DemoStudent } from "@/lib/demo-data";

const STORAGE_KEY = "phudong.student-avatar-updates.v1";

type AvatarUpdates = Record<string, string>;

function readUpdates(): AvatarUpdates {
  if (typeof window === "undefined") return {};

  try {
    const value = window.sessionStorage.getItem(STORAGE_KEY);
    if (!value) return {};
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[0] === "string" && typeof entry[1] === "string"),
    );
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
  updates[studentId] = avatarUrl;
  writeUpdates(updates);
}

/**
 * Reconciles a server-rendered roster with a just-saved avatar while Next's
 * client router is still able to reuse an older RSC payload. A server value
 * always wins when it is present and differs from the local update.
 */
export function applyStudentAvatarUpdates(students: readonly DemoStudent[]): DemoStudent[] {
  const updates = readUpdates();
  if (Object.keys(updates).length === 0) return [...students];

  let changed = false;
  const nextStudents = students.map((student) => {
    const update = updates[student.id];
    if (!update) return student;

    if (student.avatarUrl && student.avatarUrl !== update) {
      delete updates[student.id];
      changed = true;
      return student;
    }

    if (student.avatarUrl === update) {
      delete updates[student.id];
      changed = true;
      return student;
    }

    return { ...student, avatarUrl: update };
  });

  if (changed) writeUpdates(updates);
  return nextStudents;
}
