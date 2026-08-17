import { describe, expect, it } from 'vitest';

import { toStudentPresentation } from '../../src/lib/classroom/presentation';

const baseRow = {
  id: 'student-1',
  studentCode: 'HS-001',
  fullName: 'Nguyễn An',
  shortName: 'NA',
  birthDate: '2019-09-12',
  gender: 'male' as const,
  seatNo: 1,
  groupName: 'Tổ Mặt Trời',
  classRoleName: 'Lớp trưởng',
  lifetimeScore: 42,
  spendableStars: 18,
};

describe('student presentation', () => {
  it('carries class role and maps task status for teacher filters', () => {
    expect(toStudentPresentation({ ...baseRow, taskStatus: 'completed' })).toMatchObject({
      classRole: 'Lớp trưởng',
      taskStatus: 'Đã xong',
      levelLabel: 'Chưa thiết lập cấp độ',
    });
    expect(toStudentPresentation({ ...baseRow, taskStatus: 'in_progress' }).taskStatus).toBe('Đang làm');
    expect(toStudentPresentation({ ...baseRow, taskStatus: 'not_started' }).taskStatus).toBe('Chưa bắt đầu');
  });

  it('keeps the persisted avatar URL for dashboard cards', () => {
    expect(toStudentPresentation({ ...baseRow, taskStatus: 'not_started', avatarUrl: '/avatars/female-02.png' }).avatarUrl).toBe('/avatars/female-02.png');
  });
});
