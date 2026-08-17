export type StudentImportField =
  | 'stt'
  | 'studentCode'
  | 'fullName'
  | 'gender'
  | 'birthDate'
  | 'group'
  | 'classRole'
  | 'seatNumber'
  | 'contactPhone'
  | 'fatherName'
  | 'motherName'
  | 'className'
  | 'classId';

export type StudentGender = 'male' | 'female' | 'other' | 'undisclosed';

export interface StudentImportContext {
  organizationId: string;
  schoolYearId: string;
  classId: string;
  className?: string;
}

export type RawStudentImportRow = Record<string, unknown>;

export interface NormalizedStudentImportRow {
  rowNumber: number;
  stt?: number;
  seatNumber?: number;
  studentCode: string;
  fullName: string;
  gender?: StudentGender;
  birthDate?: string;
  group?: string;
  classRole?: string;
  contactPhone?: string;
  fatherName?: string;
  motherName?: string;
  className?: string;
  classId?: string;
  upsertKeys: StudentUpsertKeys;
}

export interface StudentUpsertKeys {
  studentKey: string;
  classMembershipKey: string;
}

export type StudentImportErrorCode =
  | 'missing_header'
  | 'duplicate_header'
  | 'no_rows'
  | 'missing_value'
  | 'duplicate_student_code'
  | 'duplicate_seat_number'
  | 'invalid_stt'
  | 'invalid_seat_number'
  | 'invalid_gender'
  | 'invalid_birth_date'
  | 'class_mismatch'
  | 'class_context_name_required';

export interface StudentImportError {
  rowNumber: number;
  code: StudentImportErrorCode;
  field?: StudentImportField;
  message: string;
}

export interface StudentImportCounts {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errorCount: number;
  upsertCandidates: number;
}

export interface PiiSafeStudentImportSummary extends StudentImportCounts {
  status: 'ready' | 'invalid';
  errorsByCode: Readonly<Record<StudentImportErrorCode, number>>;
  piiSafe: true;
  logMessage: string;
}

export interface StudentImportPlan {
  context: StudentImportContext;
  normalizedHeaders: Readonly<Record<string, StudentImportField>>;
  normalizedRows: readonly NormalizedStudentImportRow[];
  errors: readonly StudentImportError[];
  counts: StudentImportCounts;
  summary: PiiSafeStudentImportSummary;
}

export class StudentImportInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentImportInputError';
  }
}

const HEADER_ALIASES: Readonly<Record<StudentImportField, readonly string[]>> = {
  stt: ['stt', 'số thứ tự', 'số tt', 'tt', 'no', 'no.', 'number', 'serial', 'serial no'],
  studentCode: [
    'mã học sinh',
    'mã hs',
    'mhs',
    'student code',
    'student_code',
    'student id',
    'student_id',
    'id học sinh',
    'code',
  ],
  fullName: [
    'họ và tên',
    'họ tên',
    'họ tên học sinh',
    'tên học sinh',
    'full name',
    'full_name',
    'student name',
    'student_name',
    'name',
  ],
  gender: ['giới tính', 'phái', 'gender', 'sex'],
  birthDate: [
    'ngày sinh',
    'ngày tháng năm sinh',
    'date of birth',
    'birth date',
    'birth_date',
    'dob',
  ],
  group: ['tổ', 'nhóm', 'group', 'group name', 'group_name', 'team'],
  classRole: ['chức vụ', 'chức vụ lớp', 'vai trò lớp', 'class role', 'class_role', 'role'],
  seatNumber: ['số ghế', 'số chỗ', 'seat', 'seat no', 'seat number', 'seat_number'],
  contactPhone: ['điện thoại', 'số điện thoại', 'phone', 'phone number', 'contact phone', 'contact_phone'],
  fatherName: ['tên cha', 'họ tên cha', 'tên bố', 'họ tên bố', 'father name', 'father_name', 'parent father'],
  motherName: ['tên mẹ', 'họ tên mẹ', 'mother name', 'mother_name', 'parent mother'],
  className: ['lớp', 'lớp học', 'class', 'class name', 'class_name'],
  classId: ['mã lớp', 'mã lớp học', 'class id', 'class_id'],
};

const GENDER_ALIASES: Readonly<Record<string, StudentGender>> = {
  nam: 'male',
  male: 'male',
  m: 'male',
  trai: 'male',
  nữ: 'female',
  nu: 'female',
  female: 'female',
  f: 'female',
  gái: 'female',
  gai: 'female',
  khác: 'other',
  khac: 'other',
  other: 'other',
  o: 'other',
  'không rõ': 'undisclosed',
  'khong ro': 'undisclosed',
  'chưa xác định': 'undisclosed',
  'chua xac dinh': 'undisclosed',
  undisclosed: 'undisclosed',
  unknown: 'undisclosed',
};

const ERROR_MESSAGES: Readonly<Record<StudentImportErrorCode, string>> = {
  missing_header: 'Required import header is missing.',
  duplicate_header: 'Multiple headers map to the same import field.',
  no_rows: 'The import contains no data rows.',
  missing_value: 'A required value is missing.',
  duplicate_student_code: 'Student code is duplicated in the import.',
  duplicate_seat_number: 'Seat number is duplicated in the import.',
  invalid_stt: 'STT must be a positive integer.',
  invalid_seat_number: 'Seat number must be a positive integer.',
  invalid_gender: 'Gender is not supported.',
  invalid_birth_date: 'Birth date is invalid.',
  class_mismatch: 'Row class does not match the import context.',
  class_context_name_required: 'Class name context is required to validate the row class.',
};

const REQUIRED_FIELDS: readonly StudentImportField[] = ['studentCode', 'fullName'];

function removeVietnameseMarks(value: string): string {
  return value
    .replace(/đ/gi, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeHeaderKey(value: string): string {
  return removeVietnameseMarks(value)
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9]+/g, '');
}

function normalizeComparableText(value: string): string {
  return removeVietnameseMarks(value).toLocaleLowerCase('en-US').trim().replace(/\s+/g, ' ');
}

function normalizeIdentifier(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export function normalizeStudentCode(value: unknown): string {
  return toText(value)?.replace(/\s+/g, '').toLocaleUpperCase('en-US') ?? '';
}

function toText(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s+/g, ' ');
    return normalized || undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function buildAliasLookup(): Readonly<Record<string, StudentImportField>> {
  const lookup: Record<string, StudentImportField> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES) as [StudentImportField, readonly string[]][]) {
    for (const alias of aliases) {
      lookup[normalizeHeaderKey(alias)] = field;
    }
  }

  return lookup;
}

const HEADER_ALIAS_LOOKUP = buildAliasLookup();

export function normalizeStudentImportHeader(header: string): StudentImportField | undefined {
  return HEADER_ALIAS_LOOKUP[normalizeHeaderKey(header)];
}

export function normalizeStudentImportHeaders(
  headers: readonly string[],
): {
  fields: Readonly<Record<string, StudentImportField>>;
  errors: readonly StudentImportError[];
} {
  const fields: Record<string, StudentImportField> = {};
  const firstHeaderByField = new Map<StudentImportField, string>();
  const errors: StudentImportError[] = [];

  headers.forEach((header) => {
    const field = normalizeStudentImportHeader(header);
    if (!field) {
      return;
    }

    const previousHeader = firstHeaderByField.get(field);
    if (previousHeader) {
      errors.push({
        rowNumber: 1,
        code: 'duplicate_header',
        field,
        message: ERROR_MESSAGES.duplicate_header,
      });
      return;
    }

    firstHeaderByField.set(field, header);
    fields[header] = field;
  });

  for (const field of REQUIRED_FIELDS) {
    if (!firstHeaderByField.has(field)) {
      errors.push({
        rowNumber: 1,
        code: 'missing_header',
        field,
        message: ERROR_MESSAGES.missing_header,
      });
    }
  }

  return { fields, errors };
}

function assertImportContext(context: StudentImportContext): void {
  if (!context || typeof context !== 'object') {
    throw new StudentImportInputError('Import context is required.');
  }

  for (const field of ['organizationId', 'schoolYearId', 'classId'] as const) {
    if (typeof context[field] !== 'string' || !context[field].trim()) {
      throw new StudentImportInputError(`${field} is required in the import context.`);
    }
  }
}

function encodeKeyPart(value: string): string {
  return encodeURIComponent(value.trim().toLocaleLowerCase('en-US'));
}

export function buildStudentUpsertKey(context: StudentImportContext, studentCode: unknown): string {
  assertImportContext(context);
  const normalizedCode = normalizeStudentCode(studentCode);
  if (!normalizedCode) {
    throw new StudentImportInputError('studentCode is required to build an upsert key.');
  }

  return `student:${encodeKeyPart(context.organizationId)}:${encodeKeyPart(normalizedCode)}`;
}

export function buildClassMembershipUpsertKey(
  context: StudentImportContext,
  studentCode: unknown,
): string {
  assertImportContext(context);
  const normalizedCode = normalizeStudentCode(studentCode);
  if (!normalizedCode) {
    throw new StudentImportInputError('studentCode is required to build an upsert key.');
  }

  return [
    'class_student',
    encodeKeyPart(context.organizationId),
    encodeKeyPart(context.schoolYearId),
    encodeKeyPart(context.classId),
    encodeKeyPart(normalizedCode),
  ].join(':');
}

export function buildStudentUpsertKeys(
  context: StudentImportContext,
  studentCode: unknown,
): StudentUpsertKeys {
  return {
    studentKey: buildStudentUpsertKey(context, studentCode),
    classMembershipKey: buildClassMembershipUpsertKey(context, studentCode),
  };
}

function parsePositiveInteger(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
  }

  return undefined;
}

function parseGender(value: unknown): StudentGender | undefined | 'invalid' {
  const text = toText(value);
  if (!text) {
    return undefined;
  }

  const normalized = normalizeComparableText(text);
  return GENDER_ALIASES[normalized] ?? 'invalid';
}

function formatDate(year: number, month: number, day: number): string | undefined {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return undefined;
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
    .toString()
    .padStart(2, '0')}`;
}

function parseBirthDate(value: unknown): string | undefined | 'invalid' {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return 'invalid';
    }
    return formatDate(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate()) ?? 'invalid';
  }

  const text = toText(value);
  if (!text) {
    return undefined;
  }

  let match = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(text);
  if (match) {
    return formatDate(Number(match[1]), Number(match[2]), Number(match[3])) ?? 'invalid';
  }

  match = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/.exec(text);
  if (match) {
    return formatDate(Number(match[3]), Number(match[2]), Number(match[1])) ?? 'invalid';
  }

  return 'invalid';
}

function readField(
  row: RawStudentImportRow,
  headers: readonly string[],
  fields: Readonly<Record<string, StudentImportField>>,
  field: StudentImportField,
): unknown {
  const rawHeader = headers.find((header) => fields[header] === field);
  if (!rawHeader) {
    return undefined;
  }

  return row[rawHeader];
}

function addError(
  errors: StudentImportError[],
  rowNumber: number,
  code: StudentImportErrorCode,
  field?: StudentImportField,
): void {
  errors.push({ rowNumber, code, field, message: ERROR_MESSAGES[code] });
}

function validateClassMatch(
  row: RawStudentImportRow,
  rowNumber: number,
  headers: readonly string[],
  fields: Readonly<Record<string, StudentImportField>>,
  context: StudentImportContext,
  errors: StudentImportError[],
): { className?: string; classId?: string } {
  const rawClassId = toText(readField(row, headers, fields, 'classId'));
  const rawClassName = toText(readField(row, headers, fields, 'className'));

  if (rawClassId && normalizeIdentifier(rawClassId) !== normalizeIdentifier(context.classId)) {
    addError(errors, rowNumber, 'class_mismatch', 'classId');
  }

  if (rawClassName) {
    if (!context.className?.trim()) {
      addError(errors, rowNumber, 'class_context_name_required', 'className');
    } else if (normalizeComparableText(rawClassName) !== normalizeComparableText(context.className)) {
      addError(errors, rowNumber, 'class_mismatch', 'className');
    }
  }

  return { className: rawClassName, classId: rawClassId };
}

function summarizeErrors(errors: readonly StudentImportError[]): Readonly<Record<StudentImportErrorCode, number>> {
  const counts = Object.fromEntries(
    Object.keys(ERROR_MESSAGES).map((code) => [code, 0]),
  ) as Record<StudentImportErrorCode, number>;
  for (const error of errors) {
    counts[error.code] += 1;
  }

  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  ) as Readonly<Record<StudentImportErrorCode, number>>;
}

export function buildPiiSafeStudentImportSummary(
  counts: StudentImportCounts,
  errors: readonly StudentImportError[],
): PiiSafeStudentImportSummary {
  const errorsByCode = summarizeErrors(errors);
  const status = errors.length === 0 ? 'ready' : 'invalid';
  const logMessage = [
    'student_import',
    `status=${status}`,
    `total_rows=${counts.totalRows}`,
    `valid_rows=${counts.validRows}`,
    `invalid_rows=${counts.invalidRows}`,
    `error_count=${counts.errorCount}`,
    `upsert_candidates=${counts.upsertCandidates}`,
  ].join(' ');

  return { ...counts, status, errorsByCode, piiSafe: true, logMessage };
}

export const toPiiSafeStudentImportSummary = buildPiiSafeStudentImportSummary;

export function buildStudentImportPlan(input: {
  context: StudentImportContext;
  rows: readonly RawStudentImportRow[];
  headers?: readonly string[];
}): StudentImportPlan {
  assertImportContext(input.context);

  const rows = input.rows ?? [];
  const headers = input.headers ? [...input.headers] : Object.keys(rows[0] ?? {});
  const normalizedHeaderResult = normalizeStudentImportHeaders(headers);
  const errors: StudentImportError[] = [...normalizedHeaderResult.errors];
  const parsedRows: Array<NormalizedStudentImportRow | undefined> = [];
  const rowErrors = new Map<number, StudentImportError[]>();
  const codeRows = new Map<string, number[]>();
  const seatRows = new Map<number, number[]>();

  if (rows.length === 0) {
    addError(errors, 0, 'no_rows');
  }

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const rowErrorList: StudentImportError[] = [];
    const studentCode = normalizeStudentCode(
      readField(row, headers, normalizedHeaderResult.fields, 'studentCode'),
    );
    const fullName = toText(readField(row, headers, normalizedHeaderResult.fields, 'fullName'));

    if (!studentCode) {
      addError(rowErrorList, rowNumber, 'missing_value', 'studentCode');
    } else {
      const occurrences = codeRows.get(studentCode) ?? [];
      occurrences.push(rowNumber);
      codeRows.set(studentCode, occurrences);
    }

    if (!fullName) {
      addError(rowErrorList, rowNumber, 'missing_value', 'fullName');
    }

    const rawStt = readField(row, headers, normalizedHeaderResult.fields, 'stt');
    const sttText = toText(rawStt);
    const stt = sttText ? parsePositiveInteger(rawStt) : undefined;
    if (sttText && stt === undefined) {
      addError(rowErrorList, rowNumber, 'invalid_stt', 'stt');
    }

    const rawSeatNumber = readField(row, headers, normalizedHeaderResult.fields, 'seatNumber');
    const seatText = toText(rawSeatNumber);
    const explicitSeatNumber = seatText ? parsePositiveInteger(rawSeatNumber) : undefined;
    if (seatText && explicitSeatNumber === undefined) {
      addError(rowErrorList, rowNumber, 'invalid_seat_number', 'seatNumber');
    }

    if (stt !== undefined && explicitSeatNumber !== undefined && stt !== explicitSeatNumber) {
      addError(rowErrorList, rowNumber, 'invalid_seat_number', 'seatNumber');
    }

    const seatNumber = explicitSeatNumber ?? stt;
    if (seatNumber !== undefined) {
      const occurrences = seatRows.get(seatNumber) ?? [];
      occurrences.push(rowNumber);
      seatRows.set(seatNumber, occurrences);
    }

    const parsedGender = parseGender(readField(row, headers, normalizedHeaderResult.fields, 'gender'));
    if (parsedGender === 'invalid') {
      addError(rowErrorList, rowNumber, 'invalid_gender', 'gender');
    }

    const parsedBirthDate = parseBirthDate(
      readField(row, headers, normalizedHeaderResult.fields, 'birthDate'),
    );
    if (parsedBirthDate === 'invalid') {
      addError(rowErrorList, rowNumber, 'invalid_birth_date', 'birthDate');
    }

    const classMatch = validateClassMatch(
      row,
      rowNumber,
      headers,
      normalizedHeaderResult.fields,
      input.context,
      rowErrorList,
    );

    rowErrors.set(rowNumber, rowErrorList);
    if (rowErrorList.length === 0 && studentCode && fullName) {
      parsedRows[index] = {
        rowNumber,
        stt,
        seatNumber,
        studentCode,
        fullName,
        gender: parsedGender === 'invalid' ? undefined : parsedGender,
        birthDate: parsedBirthDate === 'invalid' ? undefined : parsedBirthDate,
        group: toText(readField(row, headers, normalizedHeaderResult.fields, 'group')),
        classRole: toText(readField(row, headers, normalizedHeaderResult.fields, 'classRole')),
        contactPhone: toText(readField(row, headers, normalizedHeaderResult.fields, 'contactPhone')),
        fatherName: toText(readField(row, headers, normalizedHeaderResult.fields, 'fatherName')),
        motherName: toText(readField(row, headers, normalizedHeaderResult.fields, 'motherName')),
        className: classMatch.className,
        classId: classMatch.classId,
        upsertKeys: buildStudentUpsertKeys(input.context, studentCode),
      };
    }
  }

  for (const rowNumbers of codeRows.values()) {
    if (rowNumbers.length < 2) {
      continue;
    }
    for (const rowNumber of rowNumbers) {
      const rowErrorList = rowErrors.get(rowNumber) ?? [];
      addError(rowErrorList, rowNumber, 'duplicate_student_code', 'studentCode');
      rowErrors.set(rowNumber, rowErrorList);
    }
  }

  for (const rowNumbers of seatRows.values()) {
    if (rowNumbers.length < 2) {
      continue;
    }
    for (const rowNumber of rowNumbers) {
      const rowErrorList = rowErrors.get(rowNumber) ?? [];
      addError(rowErrorList, rowNumber, 'duplicate_seat_number', 'seatNumber');
      rowErrors.set(rowNumber, rowErrorList);
    }
  }

  const normalizedRows = parsedRows.filter((row): row is NormalizedStudentImportRow => row !== undefined);
  const rowLevelErrors = [...rowErrors.values()].flat();
  errors.push(...rowLevelErrors);
  const invalidRowNumbers = new Set(rowLevelErrors.map((error) => error.rowNumber));
  const counts: StudentImportCounts = {
    totalRows: rows.length,
    validRows: normalizedRows.filter((row) => !invalidRowNumbers.has(row.rowNumber)).length,
    invalidRows: invalidRowNumbers.size,
    errorCount: errors.length,
    upsertCandidates: normalizedRows.filter((row) => !invalidRowNumbers.has(row.rowNumber)).length,
  };

  const summary = buildPiiSafeStudentImportSummary(counts, errors);
  return {
    context: { ...input.context },
    normalizedHeaders: normalizedHeaderResult.fields,
    normalizedRows: normalizedRows.filter((row) => !invalidRowNumbers.has(row.rowNumber)),
    errors,
    counts,
    summary,
  };
}

export const createStudentImportPlan = buildStudentImportPlan;
