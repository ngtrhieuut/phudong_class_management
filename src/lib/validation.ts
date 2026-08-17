import { z } from 'zod';

const uuidSchema = z.string().uuid();
const nonEmptyText = (max: number) => z.string().trim().min(1).max(max);

export const signUpInputSchema = z
  .object({
    name: nonEmptyText(100),
    email: z.string().trim().email("Email không hợp lệ.").max(320, "Email quá dài."),
    password: z
      .string()
      .min(8, "Mật khẩu cần có ít nhất 8 ký tự.")
      .max(128, "Mật khẩu không được dài quá 128 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng nhập lại mật khẩu."),
  })
  .refine((input) => input.password === input.confirmPassword, {
    path: ["confirmPassword"],
    message: "Mật khẩu xác nhận không khớp.",
  });

export type SignUpInput = z.infer<typeof signUpInputSchema>;

export const scoreTransactionInputSchema = z
  .object({
    classId: uuidSchema,
    studentId: uuidSchema,
    actorUserId: uuidSchema,
    behaviorTemplateId: uuidSchema.nullable().optional(),
    transactionType: z.enum(['behavior', 'task', 'badge', 'reward', 'adjustment', 'manual']),
    lifetimeDelta: z.number().int().min(-10000).max(10000),
    spendableDelta: z.number().int().min(-10000).max(10000),
    reason: nonEmptyText(500),
    note: z.string().trim().max(2000).nullable().optional(),
    sourceTransactionId: uuidSchema.nullable().optional(),
    occurredAt: z.coerce.date().optional(),
  })
  .superRefine((input, context) => {
    if (input.lifetimeDelta === 0 && input.spendableDelta === 0) {
      context.addIssue({
        code: 'custom',
        path: ['lifetimeDelta'],
        message: 'At least one score delta must be non-zero.',
      });
    }

    if (input.transactionType === 'adjustment' && !input.sourceTransactionId) {
      context.addIssue({
        code: 'custom',
        path: ['sourceTransactionId'],
        message: 'An adjustment must reference the transaction it corrects.',
      });
    }
  });

export const createScoreTransactionSchema = scoreTransactionInputSchema;
export type ScoreTransactionInput = z.infer<typeof scoreTransactionInputSchema>;

export const levelDefinitionInputSchema = z
  .object({
    classId: uuidSchema.nullable().optional(),
    name: nonEmptyText(100),
    minScore: z.number().int().min(0),
    maxScore: z.number().int().min(0).nullable().optional(),
    imageUrl: z.string().url().nullable().optional(),
    sortOrder: z.number().int().min(0).default(0),
  })
  .refine(
    (input) => input.maxScore === null || input.maxScore === undefined || input.maxScore >= input.minScore,
    {
      path: ['maxScore'],
      message: 'maxScore must be greater than or equal to minScore.',
    },
  );

export const classMembershipInputSchema = z.object({
  classId: uuidSchema,
  userId: uuidSchema,
  role: z.enum(['homeroom_teacher', 'teacher', 'assistant']),
});

export const guardianVisibilityInputSchema = z.object({
  guardianId: uuidSchema,
  studentId: uuidSchema,
  canView: z.boolean().default(true),
  receivesNotifications: z.boolean().default(true),
});

export const taskInputSchema = z
  .object({
    classId: uuidSchema,
    title: nonEmptyText(200),
    description: nonEmptyText(4000),
    scope: z.enum(['student', 'group', 'class']),
    rewardStars: z.number().int().min(0).max(10000).default(0),
    completionMode: z.enum(['manual', 'rule_based']).default('manual'),
    startsAt: z.coerce.date(),
    dueAt: z.coerce.date(),
    createdBy: uuidSchema,
  })
  .refine((input) => input.dueAt >= input.startsAt, {
    path: ['dueAt'],
    message: 'dueAt must be on or after startsAt.',
  });

export const rewardRedemptionInputSchema = z.object({
  rewardId: uuidSchema,
  studentId: uuidSchema,
  classId: uuidSchema,
  costStars: z.number().int().positive().max(100000),
});

export const praisePostInputSchema = z.object({
  classId: uuidSchema,
  authorUserId: uuidSchema,
  title: nonEmptyText(200),
  body: nonEmptyText(10000),
  visibility: z.enum(['class', 'related_guardians', 'teacher_only']).default('class'),
  studentIds: z.array(uuidSchema).min(1).max(100),
});
