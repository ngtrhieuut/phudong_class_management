import { getParentChildData, getParentChildren } from "@/lib/parent/queries";

export async function resolveParentChild(userId: string, requestedStudentId?: string) {
  const children = await getParentChildren(userId);
  const studentId = children.find((child) => child.studentId === requestedStudentId)?.studentId ?? children[0]?.studentId;
  return { children, studentId, data: studentId ? await getParentChildData(userId, studentId) : null };
}
