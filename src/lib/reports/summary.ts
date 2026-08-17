export type MonthlySummaryStudent = {
  studentId: string;
  studentCode: string;
  studentName: string;
};

export type MonthlySummaryAggregate = {
  scoreEvents?: unknown;
  lifetimeDelta?: unknown;
  spendableDelta?: unknown;
  totalAssignments?: unknown;
  completedAssignments?: unknown;
  badgesEarned?: unknown;
  rewardRedemptions?: unknown;
};

export type MonthlySummaryRow = MonthlySummaryStudent & {
  month: string;
  scoreEvents: number;
  lifetimeDelta: number;
  spendableDelta: number;
  totalAssignments: number;
  completedAssignments: number;
  badgesEarned: number;
  rewardRedemptions: number;
};

function finiteNumber(value: unknown): number {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

export function buildMonthlySummaryRow(
  student: MonthlySummaryStudent,
  month: string,
  aggregate: MonthlySummaryAggregate = {},
): MonthlySummaryRow {
  return {
    ...student,
    month,
    scoreEvents: finiteNumber(aggregate.scoreEvents),
    lifetimeDelta: finiteNumber(aggregate.lifetimeDelta),
    spendableDelta: finiteNumber(aggregate.spendableDelta),
    totalAssignments: finiteNumber(aggregate.totalAssignments),
    completedAssignments: finiteNumber(aggregate.completedAssignments),
    badgesEarned: finiteNumber(aggregate.badgesEarned),
    rewardRedemptions: finiteNumber(aggregate.rewardRedemptions),
  };
}
