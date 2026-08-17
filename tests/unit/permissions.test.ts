import { describe, expect, it } from 'vitest';

import {
  canGuardianViewContent,
  canGuardianViewStudent,
  canGuardianViewStudents,
  canTeacherAccessClass,
  hasClassMembership,
  hasOrganizationRole,
} from '../../src/lib/permissions';

const teacherMemberships = [
  { userId: 'teacher-1', classId: 'class-a', role: 'teacher' as const },
  { userId: 'assistant-1', classId: 'class-a', role: 'assistant' as const },
];

const guardianRelations = [
  { guardianId: 'guardian-1', studentId: 'student-a', canView: true },
  { guardianId: 'guardian-1', studentId: 'student-b', canView: false },
];

describe('permission helpers', () => {
  it('allows a teacher in the assigned class and rejects a foreign class', () => {
    expect(canTeacherAccessClass('teacher-1', 'class-a', teacherMemberships)).toBe(true);
    expect(canTeacherAccessClass('teacher-1', 'class-b', teacherMemberships)).toBe(false);
  });

  it('keeps assistant viewing separate from teacher write access', () => {
    expect(hasClassMembership('assistant-1', 'class-a', teacherMemberships)).toBe(true);
    expect(canTeacherAccessClass('assistant-1', 'class-a', teacherMemberships)).toBe(false);
  });

  it('recognizes organization admins without querying a database', () => {
    expect(
      hasOrganizationRole('admin-1', 'org-a', [
        { userId: 'admin-1', organizationId: 'org-a', role: 'admin' },
      ]),
    ).toBe(true);
    expect(
      hasOrganizationRole('teacher-1', 'org-a', [
        { userId: 'teacher-1', organizationId: 'org-a', role: 'teacher' },
      ]),
    ).toBe(false);
  });

  it('allows guardians to view only linked students with canView enabled', () => {
    expect(canGuardianViewStudent('guardian-1', 'student-a', guardianRelations)).toBe(true);
    expect(canGuardianViewStudent('guardian-1', 'student-b', guardianRelations)).toBe(false);
    expect(canGuardianViewStudent('guardian-2', 'student-a', guardianRelations)).toBe(false);
    expect(canGuardianViewStudents('guardian-1', ['student-a'], guardianRelations)).toBe(true);
    expect(canGuardianViewStudents('guardian-1', [], guardianRelations)).toBe(false);
  });

  it('does not expose teacher-only content to guardians', () => {
    expect(
      canGuardianViewContent('guardian-1', ['student-a'], 'related_guardians', guardianRelations),
    ).toBe(true);
    expect(canGuardianViewContent('guardian-1', ['student-a'], 'teacher_only', guardianRelations)).toBe(
      false,
    );
    expect(canGuardianViewContent('guardian-1', ['student-b'], 'class', guardianRelations)).toBe(false);
  });
});
