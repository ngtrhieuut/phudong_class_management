import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const createdAt = () => timestamp('created_at', { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).defaultNow().notNull();

export const userStatusEnum = pgEnum('user_status', ['active', 'invited', 'suspended', 'archived']);
export const organizationMemberRoleEnum = pgEnum('organization_member_role', [
  'admin',
  'teacher',
  'staff',
]);
export const classMembershipRoleEnum = pgEnum('class_membership_role', [
  'homeroom_teacher',
  'teacher',
  'assistant',
]);
export const studentStatusEnum = pgEnum('student_status', [
  'active',
  'inactive',
  'graduated',
  'archived',
]);
export const genderEnum = pgEnum('gender', ['male', 'female', 'other', 'undisclosed']);
export const behaviorCategoryEnum = pgEnum('behavior_category', ['positive', 'needs_improvement']);
export const parentVisibilityEnum = pgEnum('parent_visibility', ['visible', 'hidden']);
export const scoreTransactionTypeEnum = pgEnum('score_transaction_type', [
  'behavior',
  'task',
  'badge',
  'reward',
  'adjustment',
  'manual',
]);
export const taskScopeEnum = pgEnum('task_scope', ['student', 'group', 'class']);
export const taskCompletionModeEnum = pgEnum('task_completion_mode', ['manual', 'rule_based']);
export const taskStatusEnum = pgEnum('task_status', [
  'draft',
  'active',
  'completed',
  'expired',
  'cancelled',
]);
export const taskAssignmentStatusEnum = pgEnum('task_assignment_status', [
  'pending',
  'completed',
  'expired',
  'cancelled',
]);
export const rewardTypeEnum = pgEnum('reward_type', [
  'privilege',
  'activity',
  'physical',
  'recognition',
]);
export const rewardRedemptionStatusEnum = pgEnum('reward_redemption_status', [
  'requested',
  'approved',
  'fulfilled',
  'rejected',
  'cancelled',
]);
export const praiseVisibilityEnum = pgEnum('praise_visibility', [
  'class',
  'related_guardians',
  'teacher_only',
]);
export const noteVisibilityEnum = pgEnum('note_visibility', ['teacher_only', 'guardian_visible']);

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: text('name').notNull(),
    code: text('code').notNull(),
    settingsJson: jsonb('settings_json').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('organizations_code_key').on(table.code),
    check('organizations_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('organizations_code_not_blank', sql`length(trim(${table.code})) > 0`),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email'),
    phone: text('phone'),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    status: userStatusEnum('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('users_email_key').on(table.email),
    uniqueIndex('users_phone_key').on(table.phone),
    index('users_status_idx').on(table.status),
    check('users_display_name_not_blank', sql`length(trim(${table.displayName})) > 0`),
  ],
);

export const organizationMembers = pgTable(
  'organization_members',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: organizationMemberRoleEnum('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('organization_members_organization_user_key').on(table.organizationId, table.userId),
    index('organization_members_user_idx').on(table.userId),
    index('organization_members_organization_role_idx').on(table.organizationId, table.role),
  ],
);

export const schoolYears = pgTable(
  'school_years',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    active: boolean('active').notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('school_years_organization_name_key').on(table.organizationId, table.name),
    index('school_years_organization_active_idx').on(table.organizationId, table.active),
    check('school_years_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('school_years_date_range_check', sql`${table.endsAt} > ${table.startsAt}`),
  ],
);

export const classes = pgTable(
  'classes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    schoolYearId: uuid('school_year_id')
      .notNull()
      .references(() => schoolYears.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    grade: integer('grade').notNull(),
    homeroomTeacherId: uuid('homeroom_teacher_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    coverUrl: text('cover_url'),
    settingsJson: jsonb('settings_json').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('classes_school_year_name_key').on(table.schoolYearId, table.name),
    index('classes_organization_idx').on(table.organizationId),
    index('classes_homeroom_teacher_idx').on(table.homeroomTeacherId),
    check('classes_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('classes_grade_range_check', sql`${table.grade} between 1 and 12`),
  ],
);

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    studentCode: text('student_code').notNull(),
    fullName: text('full_name').notNull(),
    shortName: text('short_name'),
    birthDate: date('birth_date'),
    gender: genderEnum('gender'),
    avatarUrl: text('avatar_url'),
    status: studentStatusEnum('status').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('students_organization_code_key').on(table.organizationId, table.studentCode),
    index('students_organization_status_idx').on(table.organizationId, table.status),
    check('students_code_not_blank', sql`length(trim(${table.studentCode})) > 0`),
    check('students_full_name_not_blank', sql`length(trim(${table.fullName})) > 0`),
  ],
);

export const classRoles = pgTable(
  'class_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    icon: text('icon'),
    description: text('description'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('class_roles_class_name_key').on(table.classId, table.name),
    unique('class_roles_class_id_key').on(table.classId, table.id),
    index('class_roles_class_sort_idx').on(table.classId, table.sortOrder),
    check('class_roles_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('class_roles_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const classStudents = pgTable(
  'class_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    seatNo: integer('seat_no'),
    groupName: text('group_name'),
    classRoleId: uuid('class_role_id'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('class_students_class_student_key').on(table.classId, table.studentId),
    unique('class_students_class_id_key').on(table.classId, table.id),
    index('class_students_student_idx').on(table.studentId),
    index('class_students_class_active_idx').on(table.classId, table.leftAt),
    foreignKey({
      columns: [table.classId, table.classRoleId],
      foreignColumns: [classRoles.classId, classRoles.id],
      name: 'class_students_class_role_fk',
    }).onDelete('restrict'),
    check('class_students_seat_no_check', sql`${table.seatNo} is null or ${table.seatNo} > 0`),
    check(
      'class_students_membership_dates_check',
      sql`${table.leftAt} is null or ${table.leftAt} >= ${table.joinedAt}`,
    ),
  ],
);

export const classMemberships = pgTable(
  'class_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    role: classMembershipRoleEnum('role').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('class_memberships_class_user_key').on(table.classId, table.userId),
    index('class_memberships_user_role_idx').on(table.userId, table.role),
    index('class_memberships_class_role_idx').on(table.classId, table.role),
  ],
);

export const guardians = pgTable(
  'guardians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    phone: text('phone'),
    email: text('email'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('guardians_user_key').on(table.userId),
    index('guardians_phone_idx').on(table.phone),
    index('guardians_email_idx').on(table.email),
    check('guardians_full_name_not_blank', sql`length(trim(${table.fullName})) > 0`),
  ],
);

export const studentGuardians = pgTable(
  'student_guardians',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    guardianId: uuid('guardian_id')
      .notNull()
      .references(() => guardians.id, { onDelete: 'restrict' }),
    relationship: text('relationship').notNull(),
    canView: boolean('can_view').notNull().default(true),
    receivesNotifications: boolean('receives_notifications').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('student_guardians_student_guardian_key').on(table.studentId, table.guardianId),
    index('student_guardians_guardian_view_idx').on(table.guardianId, table.canView),
    index('student_guardians_student_idx').on(table.studentId),
    check('student_guardians_relationship_not_blank', sql`length(trim(${table.relationship})) > 0`),
  ],
);

export const guardianInvitationStatusEnum = pgEnum('guardian_invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const guardianInvitations = pgTable(
  'guardian_invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    createdByUserId: uuid('created_by_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    acceptedByUserId: uuid('accepted_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    guardianEmail: text('guardian_email').notNull(),
    relationship: text('relationship').notNull(),
    tokenHash: text('token_hash').notNull(),
    status: guardianInvitationStatusEnum('status').notNull().default('pending'),
    canView: boolean('can_view').notNull().default(true),
    receivesNotifications: boolean('receives_notifications').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('guardian_invitations_token_hash_key').on(table.tokenHash),
    index('guardian_invitations_class_student_status_idx').on(table.classId, table.studentId, table.status),
    index('guardian_invitations_organization_created_idx').on(table.organizationId, table.createdAt.desc()),
    index('guardian_invitations_email_status_idx').on(table.guardianEmail, table.status),
    foreignKey({
      columns: [table.classId, table.studentId],
      foreignColumns: [classStudents.classId, classStudents.studentId],
      name: 'guardian_invitations_class_student_fk',
    }).onDelete('restrict'),
    check('guardian_invitations_email_not_blank', sql`length(trim(${table.guardianEmail})) > 0`),
    check('guardian_invitations_relationship_not_blank', sql`length(trim(${table.relationship})) > 0`),
    check('guardian_invitations_token_hash_not_blank', sql`length(trim(${table.tokenHash})) > 0`),
    check('guardian_invitations_expiry_check', sql`${table.expiresAt} > ${table.createdAt}`),
  ],
);

export const behaviorTemplates = pgTable(
  'behavior_templates',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id').references(() => organizations.id, {
      onDelete: 'set null',
    }),
    classId: uuid('class_id').references(() => classes.id, { onDelete: 'set null' }),
    name: text('name').notNull(),
    category: behaviorCategoryEnum('category').notNull(),
    defaultPoints: integer('default_points').notNull(),
    icon: text('icon'),
    colorToken: text('color_token'),
    parentVisibility: parentVisibilityEnum('parent_visibility').notNull().default('visible'),
    dailyLimit: integer('daily_limit'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('behavior_templates_organization_name_key').on(table.organizationId, table.name),
    uniqueIndex('behavior_templates_class_name_key').on(table.classId, table.name),
    index('behavior_templates_class_active_idx').on(table.classId, table.active),
    index('behavior_templates_organization_active_idx').on(table.organizationId, table.active),
    check('behavior_templates_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('behavior_templates_daily_limit_check', sql`${table.dailyLimit} is null or ${table.dailyLimit} > 0`),
    check(
      'behavior_templates_points_match_category',
      sql`(${table.category} = 'positive' and ${table.defaultPoints} > 0) or (${table.category} = 'needs_improvement' and ${table.defaultPoints} < 0)`,
    ),
  ],
);

export const scoreTransactions = pgTable(
  'score_transactions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    behaviorTemplateId: uuid('behavior_template_id').references(() => behaviorTemplates.id, {
      onDelete: 'set null',
    }),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    transactionType: scoreTransactionTypeEnum('transaction_type').notNull(),
    lifetimeDelta: integer('lifetime_delta').notNull().default(0),
    spendableDelta: integer('spendable_delta').notNull().default(0),
    reason: text('reason').notNull(),
    note: text('note'),
    sourceTransactionId: uuid('source_transaction_id'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (table) => [
    index('score_transactions_class_student_occurred_idx').on(
      table.classId,
      table.studentId,
      table.occurredAt.desc(),
    ),
    index('score_transactions_class_behavior_occurred_idx').on(
      table.classId,
      table.behaviorTemplateId,
      table.occurredAt.desc(),
    ),
    index('score_transactions_student_occurred_idx').on(table.studentId, table.occurredAt.desc()),
    index('score_transactions_source_idx').on(table.sourceTransactionId),
    foreignKey({
      columns: [table.classId, table.studentId],
      foreignColumns: [classStudents.classId, classStudents.studentId],
      name: 'score_transactions_class_student_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.sourceTransactionId],
      foreignColumns: [table.id],
      name: 'score_transactions_source_fk',
    }).onDelete('restrict'),
    check('score_transactions_non_zero_delta', sql`${table.lifetimeDelta} <> 0 or ${table.spendableDelta} <> 0`),
    check('score_transactions_reason_not_blank', sql`length(trim(${table.reason})) > 0`),
  ],
);

export const studentScoreSnapshots = pgTable(
  'student_score_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    lifetimeScore: integer('lifetime_score').notNull().default(0),
    spendableStars: integer('spendable_stars').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('student_score_snapshots_class_student_key').on(table.classId, table.studentId),
    index('student_score_snapshots_student_idx').on(table.studentId),
    foreignKey({
      columns: [table.classId, table.studentId],
      foreignColumns: [classStudents.classId, classStudents.studentId],
      name: 'student_score_snapshots_class_student_fk',
    }).onDelete('restrict'),
    check('student_score_snapshots_lifetime_non_negative', sql`${table.lifetimeScore} >= 0`),
    check('student_score_snapshots_spendable_non_negative', sql`${table.spendableStars} >= 0`),
  ],
);

export const levelDefinitions = pgTable(
  'level_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    minScore: integer('min_score').notNull(),
    maxScore: integer('max_score'),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('level_definitions_class_name_key').on(table.classId, table.name),
    index('level_definitions_class_score_idx').on(table.classId, table.minScore),
    check('level_definitions_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('level_definitions_min_score_check', sql`${table.minScore} >= 0`),
    check(
      'level_definitions_score_range_check',
      sql`${table.maxScore} is null or ${table.maxScore} >= ${table.minScore}`,
    ),
    check('level_definitions_sort_order_check', sql`${table.sortOrder} >= 0`),
  ],
);

export const badgeDefinitions = pgTable(
  'badge_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id').references(() => classes.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    iconUrl: text('icon_url'),
    ruleJson: jsonb('rule_json').$type<Record<string, unknown> | null>(),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('badge_definitions_class_name_key').on(table.classId, table.name),
    index('badge_definitions_class_active_idx').on(table.classId, table.active),
    check('badge_definitions_name_not_blank', sql`length(trim(${table.name})) > 0`),
  ],
);

export const studentBadges = pgTable(
  'student_badges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badgeDefinitions.id, { onDelete: 'restrict' }),
    awardedBy: uuid('awarded_by').references(() => users.id, { onDelete: 'set null' }),
    awardedAt: timestamp('awarded_at', { withTimezone: true }).notNull().defaultNow(),
    reason: text('reason'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('student_badges_student_class_badge_key').on(table.studentId, table.classId, table.badgeId),
    index('student_badges_student_awarded_idx').on(table.studentId, table.awardedAt.desc()),
    index('student_badges_class_awarded_idx').on(table.classId, table.awardedAt.desc()),
    foreignKey({
      columns: [table.classId, table.studentId],
      foreignColumns: [classStudents.classId, classStudents.studentId],
      name: 'student_badges_class_student_fk',
    }).onDelete('restrict'),
  ],
);

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    description: text('description').notNull(),
    scope: taskScopeEnum('scope').notNull(),
    rewardStars: integer('reward_stars').notNull().default(0),
    completionMode: taskCompletionModeEnum('completion_mode').notNull().default('manual'),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp('due_at', { withTimezone: true }).notNull(),
    status: taskStatusEnum('status').notNull().default('draft'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('tasks_class_id_key').on(table.classId, table.id),
    index('tasks_class_status_due_idx').on(table.classId, table.status, table.dueAt),
    index('tasks_created_by_idx').on(table.createdBy),
    check('tasks_title_not_blank', sql`length(trim(${table.title})) > 0`),
    check('tasks_reward_stars_check', sql`${table.rewardStars} >= 0`),
    check('tasks_date_range_check', sql`${table.dueAt} >= ${table.startsAt}`),
  ],
);

export const taskAssignments = pgTable(
  'task_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    taskId: uuid('task_id')
      .notNull()
      .references(() => tasks.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    status: taskAssignmentStatusEnum('status').notNull().default('pending'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('task_assignments_task_student_key').on(table.taskId, table.studentId),
    index('task_assignments_student_status_idx').on(table.studentId, table.status),
    index('task_assignments_task_status_idx').on(table.taskId, table.status),
  ],
);

export const rewards = pgTable(
  'rewards',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url'),
    rewardType: rewardTypeEnum('reward_type').notNull(),
    costStars: integer('cost_stars').notNull(),
    stock: integer('stock'),
    active: boolean('active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex('rewards_class_name_key').on(table.classId, table.name),
    unique('rewards_class_id_key').on(table.classId, table.id),
    index('rewards_class_active_cost_idx').on(table.classId, table.active, table.costStars),
    check('rewards_name_not_blank', sql`length(trim(${table.name})) > 0`),
    check('rewards_cost_stars_check', sql`${table.costStars} >= 0`),
    check('rewards_stock_check', sql`${table.stock} is null or ${table.stock} >= 0`),
  ],
);

export const rewardRedemptions = pgTable(
  'reward_redemptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    rewardId: uuid('reward_id').notNull(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    costStars: integer('cost_stars').notNull(),
    status: rewardRedemptionStatusEnum('status').notNull().default('requested'),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    approvedBy: uuid('approved_by').references(() => users.id, { onDelete: 'set null' }),
    fulfilledAt: timestamp('fulfilled_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('reward_redemptions_student_status_idx').on(table.studentId, table.status),
    index('reward_redemptions_class_requested_idx').on(table.classId, table.requestedAt.desc()),
    foreignKey({
      columns: [table.classId, table.rewardId],
      foreignColumns: [rewards.classId, rewards.id],
      name: 'reward_redemptions_reward_class_fk',
    }).onDelete('restrict'),
    foreignKey({
      columns: [table.classId, table.studentId],
      foreignColumns: [classStudents.classId, classStudents.studentId],
      name: 'reward_redemptions_class_student_fk',
    }).onDelete('restrict'),
    check('reward_redemptions_cost_stars_check', sql`${table.costStars} >= 0`),
  ],
);

export const praisePosts = pgTable(
  'praise_posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    title: text('title').notNull(),
    body: text('body').notNull(),
    visibility: praiseVisibilityEnum('visibility').notNull().default('class'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('praise_posts_class_created_idx').on(table.classId, table.createdAt.desc()),
    index('praise_posts_author_idx').on(table.authorUserId),
    check('praise_posts_title_not_blank', sql`length(trim(${table.title})) > 0`),
    check('praise_posts_body_not_blank', sql`length(trim(${table.body})) > 0`),
  ],
);

export const praisePostStudents = pgTable(
  'praise_post_students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => praisePosts.id, { onDelete: 'cascade' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('praise_post_students_post_student_key').on(table.postId, table.studentId),
    index('praise_post_students_student_idx').on(table.studentId),
  ],
);

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    ownerType: text('owner_type').notNull(),
    ownerId: uuid('owner_id').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type').notNull(),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex('media_assets_storage_key_key').on(table.storageKey),
    index('media_assets_owner_idx').on(table.ownerType, table.ownerId),
    check('media_assets_owner_type_not_blank', sql`length(trim(${table.ownerType})) > 0`),
    check('media_assets_storage_key_not_blank', sql`length(trim(${table.storageKey})) > 0`),
    check('media_assets_mime_type_not_blank', sql`length(trim(${table.mimeType})) > 0`),
    check('media_assets_dimensions_check', sql`(${table.width} is null or ${table.width} > 0) and (${table.height} is null or ${table.height} > 0)`),
    check('media_assets_duration_check', sql`${table.duration} is null or ${table.duration} >= 0`),
  ],
);

export const teacherNotes = pgTable(
  'teacher_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id, { onDelete: 'restrict' }),
    authorUserId: uuid('author_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    body: text('body').notNull(),
    visibility: noteVisibilityEnum('visibility').notNull().default('teacher_only'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('teacher_notes_student_created_idx').on(table.studentId, table.createdAt.desc()),
    index('teacher_notes_class_created_idx').on(table.classId, table.createdAt.desc()),
    foreignKey({
      columns: [table.classId, table.studentId],
      foreignColumns: [classStudents.classId, classStudents.studentId],
      name: 'teacher_notes_class_student_fk',
    }).onDelete('restrict'),
    check('teacher_notes_body_not_blank', sql`length(trim(${table.body})) > 0`),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    deepLink: text('deep_link'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (table) => [
    index('notifications_user_read_created_idx').on(table.userId, table.readAt, table.createdAt.desc()),
    check('notifications_type_not_blank', sql`length(trim(${table.type})) > 0`),
    check('notifications_title_not_blank', sql`length(trim(${table.title})) > 0`),
  ],
);

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'restrict' }),
    actorUserId: uuid('actor_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    beforeJson: jsonb('before_json').$type<Record<string, unknown> | null>(),
    afterJson: jsonb('after_json').$type<Record<string, unknown> | null>(),
    ipHash: text('ip_hash'),
    createdAt: createdAt(),
  },
  (table) => [
    index('audit_logs_organization_created_idx').on(table.organizationId, table.createdAt.desc()),
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_actor_created_idx').on(table.actorUserId, table.createdAt.desc()),
    check('audit_logs_entity_type_not_blank', sql`length(trim(${table.entityType})) > 0`),
    check('audit_logs_entity_id_not_blank', sql`length(trim(${table.entityId})) > 0`),
    check('audit_logs_action_not_blank', sql`length(trim(${table.action})) > 0`),
  ],
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type OrganizationMember = typeof organizationMembers.$inferSelect;
export type SchoolYear = typeof schoolYears.$inferSelect;
export type Class = typeof classes.$inferSelect;
export type ClassMembership = typeof classMemberships.$inferSelect;
export type Student = typeof students.$inferSelect;
export type ClassStudent = typeof classStudents.$inferSelect;
export type Guardian = typeof guardians.$inferSelect;
export type StudentGuardian = typeof studentGuardians.$inferSelect;
export type ClassRole = typeof classRoles.$inferSelect;
export type BehaviorTemplate = typeof behaviorTemplates.$inferSelect;
export type ScoreTransaction = typeof scoreTransactions.$inferSelect;
export type StudentScoreSnapshot = typeof studentScoreSnapshots.$inferSelect;
export type LevelDefinition = typeof levelDefinitions.$inferSelect;
export type BadgeDefinition = typeof badgeDefinitions.$inferSelect;
export type StudentBadge = typeof studentBadges.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type TaskAssignment = typeof taskAssignments.$inferSelect;
export type Reward = typeof rewards.$inferSelect;
export type RewardRedemption = typeof rewardRedemptions.$inferSelect;
export type PraisePost = typeof praisePosts.$inferSelect;
export type PraisePostStudent = typeof praisePostStudents.$inferSelect;
export type MediaAsset = typeof mediaAssets.$inferSelect;
export type TeacherNote = typeof teacherNotes.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
