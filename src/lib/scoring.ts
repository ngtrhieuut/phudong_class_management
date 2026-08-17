export type ScoreCategory = 'positive' | 'needs_improvement';

export interface ScoreDelta {
  lifetimeDelta: number;
  spendableDelta: number;
}

export interface ScoreBalance {
  lifetimeScore: number;
  spendableStars: number;
}

export interface BehaviorScoreInput {
  category: ScoreCategory;
  points: number;
}

function assertInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value)) {
    throw new RangeError(`${fieldName} must be an integer.`);
  }
}

function normalizePositivePoints(points: number): number {
  assertInteger(points, 'points');
  if (points === 0) {
    throw new RangeError('points must not be zero.');
  }

  return Math.abs(points);
}

/**
 * Positive behavior advances both progression and spendable stars. A
 * needs-improvement behavior only reduces spendable stars, so a child does
 * not lose a level because of a single correction.
 */
export function calculateScoreDelta(input: BehaviorScoreInput): ScoreDelta;
export function calculateScoreDelta(category: ScoreCategory, points: number): ScoreDelta;
export function calculateScoreDelta(
  inputOrCategory: BehaviorScoreInput | ScoreCategory,
  points?: number,
): ScoreDelta {
  const input =
    typeof inputOrCategory === 'string'
      ? { category: inputOrCategory, points }
      : inputOrCategory;

  if (input.category !== 'positive' && input.category !== 'needs_improvement') {
    throw new RangeError('category must be positive or needs_improvement.');
  }

  const amount = normalizePositivePoints(input.points ?? 0);
  return input.category === 'positive'
    ? { lifetimeDelta: amount, spendableDelta: amount }
    : { lifetimeDelta: 0, spendableDelta: -amount };
}

export const calculateBehaviorScoreDelta = calculateScoreDelta;
export const calculateScoreDeltas = calculateScoreDelta;

export function normalizeScoreDelta(delta: ScoreDelta): ScoreDelta {
  assertInteger(delta.lifetimeDelta, 'lifetimeDelta');
  assertInteger(delta.spendableDelta, 'spendableDelta');

  if (delta.lifetimeDelta === 0 && delta.spendableDelta === 0) {
    throw new RangeError('At least one score delta must be non-zero.');
  }

  return { ...delta };
}

export function calculateRewardDelta(costStars: number): ScoreDelta {
  assertInteger(costStars, 'costStars');
  if (costStars < 0) {
    throw new RangeError('costStars must not be negative.');
  }
  if (costStars === 0) {
    throw new RangeError('costStars must be greater than zero.');
  }

  return { lifetimeDelta: 0, spendableDelta: -costStars };
}

export function sumScoreDeltas(deltas: readonly ScoreDelta[]): ScoreDelta {
  return deltas.reduce(
    (total, delta) => ({
      lifetimeDelta: total.lifetimeDelta + delta.lifetimeDelta,
      spendableDelta: total.spendableDelta + delta.spendableDelta,
    }),
    { lifetimeDelta: 0, spendableDelta: 0 },
  );
}

export function calculateScoreBalance(deltas: readonly ScoreDelta[]): ScoreBalance {
  const total = sumScoreDeltas(deltas);
  return {
    lifetimeScore: total.lifetimeDelta,
    spendableStars: total.spendableDelta,
  };
}

export function canAffordReward(balance: ScoreBalance, costStars: number): boolean {
  assertInteger(balance.spendableStars, 'balance.spendableStars');
  assertInteger(costStars, 'costStars');
  return costStars >= 0 && balance.spendableStars >= costStars;
}

export function applyScoreDelta(balance: ScoreBalance, delta: ScoreDelta): ScoreBalance {
  assertInteger(balance.lifetimeScore, 'balance.lifetimeScore');
  assertInteger(balance.spendableStars, 'balance.spendableStars');
  const normalizedDelta = normalizeScoreDelta(delta);
  const nextBalance = {
    lifetimeScore: balance.lifetimeScore + normalizedDelta.lifetimeDelta,
    spendableStars: balance.spendableStars + normalizedDelta.spendableDelta,
  };

  if (nextBalance.lifetimeScore < 0 || nextBalance.spendableStars < 0) {
    throw new RangeError('A score transaction cannot make a balance negative.');
  }

  return nextBalance;
}
