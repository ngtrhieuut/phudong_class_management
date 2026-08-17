import { describe, expect, it } from 'vitest';

import {
  buildPiiSafeStudentImportSummary,
  buildStudentImportPlan,
  buildStudentUpsertKeys,
  normalizeStudentImportHeader,
} from '../../src/lib/import/student-import';

const context = {
  organizationId: 'org-demo',
  schoolYearId: 'year-2026-2027',
  classId: 'class-1-6',
  className: 'Lớp 1/6',
};

describe('student import normalization and dry-run planning', () => {
  it('normalizes a valid roster row and builds idempotent keys', () => {
    const plan = buildStudentImportPlan({
      context,
      rows: [
        {
          STT: '1',
          'Mã học sinh': ' hs-001 ',
          'Họ và tên': '  Nguyễn  An  ',
          'Giới tính': 'Nam',
          'Ngày sinh': '12/09/2019',
          Tổ: 'Mặt Trời',
          'Chức vụ lớp': 'Lớp trưởng',
          Lớp: 'Lớp 1/6',
        },
      ],
    });

    expect(plan.errors).toEqual([]);
    expect(plan.counts).toMatchObject({ totalRows: 1, validRows: 1, invalidRows: 0 });
    expect(plan.normalizedRows[0]).toMatchObject({
      rowNumber: 2,
      stt: 1,
      seatNumber: 1,
      studentCode: 'HS-001',
      fullName: 'Nguyễn An',
      gender: 'male',
      birthDate: '2019-09-12',
      group: 'Mặt Trời',
      classRole: 'Lớp trưởng',
    });
    expect(plan.summary.piiSafe).toBe(true);
  });

  it('maps Vietnamese and English header aliases to the same fields', () => {
    expect(normalizeStudentImportHeader('SỐ THỨ TỰ')).toBe('stt');
    expect(normalizeStudentImportHeader('Student Code')).toBe('studentCode');
    expect(normalizeStudentImportHeader('FULL_NAME')).toBe('fullName');
    expect(normalizeStudentImportHeader('Date of Birth')).toBe('birthDate');
    expect(normalizeStudentImportHeader('Group Name')).toBe('group');
    expect(normalizeStudentImportHeader('Class Role')).toBe('classRole');
  });

  it('rejects duplicate student codes without matching by name', () => {
    const plan = buildStudentImportPlan({
      context,
      rows: [
        { STT: 1, 'Student Code': 'HS-001', 'Full Name': 'Nguyễn An' },
        { STT: 2, 'Student Code': ' hs-001 ', 'Full Name': 'Trần Bình' },
      ],
    });

    expect(plan.normalizedRows).toHaveLength(0);
    expect(plan.summary.errorsByCode.duplicate_student_code).toBe(2);
    expect(plan.errors.every((error) => !error.message.includes('Nguyễn'))).toBe(true);
  });

  it('rejects duplicate seats, invalid gender/date, and class mismatch', () => {
    const plan = buildStudentImportPlan({
      context,
      rows: [
        {
          STT: 1,
          'Mã học sinh': 'HS-001',
          'Họ và tên': 'Nguyễn An',
          'Giới tính': 'không xác định-ish',
          'Ngày sinh': '31/02/2019',
          Lớp: 'Lớp 1/5',
        },
        {
          STT: 1,
          'Mã học sinh': 'HS-002',
          'Họ và tên': 'Trần Bình',
          'Giới tính': 'Nữ',
          'Ngày sinh': '2019-09-12',
          Lớp: 'Lớp 1/6',
        },
      ],
    });

    expect(plan.summary.errorsByCode.invalid_gender).toBe(1);
    expect(plan.summary.errorsByCode.invalid_birth_date).toBe(1);
    expect(plan.summary.errorsByCode.duplicate_seat_number).toBe(2);
    expect(plan.summary.errorsByCode.class_mismatch).toBe(1);
    expect(plan.counts.validRows).toBe(0);
  });

  it('rejects missing required fields and invalid context instead of guessing', () => {
    expect(() =>
      buildStudentImportPlan({
        context: { ...context, classId: '' },
        rows: [{ STT: 1, 'Họ và tên': 'Nguyễn An' }],
      }),
    ).toThrow('classId is required');

    const plan = buildStudentImportPlan({
      context,
      rows: [{ STT: 1, 'Họ và tên': 'Nguyễn An' }],
    });
    expect(plan.summary.errorsByCode.missing_header).toBe(1);
    expect(plan.summary.errorsByCode.missing_value).toBe(1);
  });

  it('builds deterministic keys from context and code only', () => {
    const first = buildStudentUpsertKeys(context, ' hs-001 ');
    const second = buildStudentUpsertKeys(context, 'HS-001');

    expect(first).toEqual(second);
    expect(first.studentKey).toContain('org-demo');
    expect(first.studentKey).not.toContain('Nguyễn');
    expect(first.classMembershipKey).toContain('class-1-6');
  });

  it('returns a PII-safe aggregate summary with no names or raw rows', () => {
    const plan = buildStudentImportPlan({
      context,
      rows: [{ STT: 1, 'Mã học sinh': 'HS-001', 'Họ và tên': 'Nguyễn An' }],
    });
    const summary = buildPiiSafeStudentImportSummary(plan.counts, plan.errors);
    const serialized = JSON.stringify(summary);

    expect(summary.piiSafe).toBe(true);
    expect(summary.logMessage).toContain('student_import');
    expect(serialized).not.toContain('Nguyễn');
    expect(serialized).not.toContain('HS-001');
    expect(serialized).not.toContain('raw');
  });
});
