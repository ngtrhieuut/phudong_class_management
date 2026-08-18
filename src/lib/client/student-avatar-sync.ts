export type StudentAvatarSnapshot = {
  id: string;
  avatarUrl: string | null;
};

type StudentAvatarResponse = {
  data?: StudentAvatarSnapshot[];
};

export async function fetchStudentAvatarSnapshots(classId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/teacher/students?classId=${encodeURIComponent(classId)}&fields=avatar`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as StudentAvatarResponse | null;
  if (!Array.isArray(payload?.data)) return null;

  return payload.data.filter(
    (student): student is StudentAvatarSnapshot =>
      Boolean(student && typeof student.id === "string" && (typeof student.avatarUrl === "string" || student.avatarUrl === null)),
  );
}
