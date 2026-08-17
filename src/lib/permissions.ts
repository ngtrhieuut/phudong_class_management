export type ClassMembershipRole = 'homeroom_teacher' | 'teacher' | 'assistant' | string;
export type OrganizationRole = 'admin' | 'teacher' | 'staff' | string;

export interface ClassMembershipLike {
  classId: string;
  userId: string;
  role?: ClassMembershipRole;
}

export interface OrganizationMembershipLike {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}

export interface StudentGuardianRelationLike {
  guardianId: string;
  studentId: string;
  canView: boolean;
}

const teacherRoles = new Set(['homeroom_teacher', 'teacher']);
const classViewerRoles = new Set(['homeroom_teacher', 'teacher', 'assistant']);
const adminRoles = new Set(['admin']);

export function isClassMember(
  userId: string,
  classId: string,
  memberships: readonly ClassMembershipLike[],
): boolean {
  return memberships.some((membership) => membership.userId === userId && membership.classId === classId);
}

export function hasClassMembership(
  userId: string,
  classId: string,
  memberships: readonly ClassMembershipLike[],
  allowedRoles: ReadonlySet<string> = classViewerRoles,
): boolean {
  return memberships.some(
    (membership) =>
      membership.userId === userId &&
      membership.classId === classId &&
      allowedRoles.has(membership.role ?? ''),
  );
}

export function canTeacherAccessClass(
  userId: string,
  classId: string,
  memberships: readonly ClassMembershipLike[],
): boolean {
  return hasClassMembership(userId, classId, memberships, teacherRoles);
}

export function canManageClass(
  userId: string,
  classId: string,
  memberships: readonly ClassMembershipLike[],
): boolean {
  return canTeacherAccessClass(userId, classId, memberships);
}

export function hasOrganizationRole(
  userId: string,
  organizationId: string,
  memberships: readonly OrganizationMembershipLike[],
  allowedRoles: ReadonlySet<string> = adminRoles,
): boolean {
  return memberships.some(
    (membership) =>
      membership.userId === userId &&
      membership.organizationId === organizationId &&
      allowedRoles.has(membership.role),
  );
}

export function canGuardianViewStudent(
  guardianId: string,
  studentId: string,
  relations: readonly StudentGuardianRelationLike[],
): boolean {
  return relations.some(
    (relation) =>
      relation.guardianId === guardianId && relation.studentId === studentId && relation.canView,
  );
}

export const guardianCanViewStudent = canGuardianViewStudent;

export function canGuardianViewStudents(
  guardianId: string,
  studentIds: readonly string[],
  relations: readonly StudentGuardianRelationLike[],
): boolean {
  return (
    studentIds.length > 0 &&
    studentIds.every((studentId) => canGuardianViewStudent(guardianId, studentId, relations))
  );
}

export type GuardianContentVisibility = 'class' | 'related_guardians' | 'teacher_only';

export function canGuardianViewContent(
  guardianId: string,
  studentIds: readonly string[],
  visibility: GuardianContentVisibility,
  relations: readonly StudentGuardianRelationLike[],
): boolean {
  if (visibility === 'teacher_only' || studentIds.length === 0) {
    return false;
  }

  return studentIds.some((studentId) => canGuardianViewStudent(guardianId, studentId, relations));
}
