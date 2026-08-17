import { describe, expect, it } from 'vitest';

import {
  applyScoreDelta,
  calculateRewardDelta,
  calculateScoreBalance,
  calculateScoreDelta,
} from '../../src/lib/scoring';
import { DEFAULT_LEVEL_DEFINITIONS, getNextLevel, resolveLevel } from '../../src/lib/levels';

describe('score helpers', () => {
  it('adds positive behavior points to lifetime and spendable balances', () => {
    expect(calculateScoreDelta({ category: 'positive', points: 5 })).toEqual({
      lifetimeDelta: 5,
      spendableDelta: 5,
    });
  });

  it('keeps needs-improvement behavior out of lifetime progression', () => {
    expect(calculateScoreDelta('needs_improvement', -3)).toEqual({
      lifetimeDelta: 0,
      spendableDelta: -3,
    });
  });

  it('records reward spending only against spendable stars', () => {
    expect(calculateRewardDelta(20)).toEqual({ lifetimeDelta: 0, spendableDelta: -20 });
    expect(
      applyScoreDelta({ lifetimeScore: 55, spendableStars: 25 }, calculateRewardDelta(20)),
    ).toEqual({ lifetimeScore: 55, spendableStars: 5 });
  });

  it('rejects an overspend instead of returning a negative balance', () => {
    expect(() =>
      applyScoreDelta({ lifetimeScore: 55, spendableStars: 5 }, calculateRewardDelta(20)),
    ).toThrow('balance negative');
  });

  it('aggregates ledger deltas without mutating transaction inputs', () => {
    expect(
      calculateScoreBalance([
        { lifetimeDelta: 5, spendableDelta: 5 },
        { lifetimeDelta: 0, spendableDelta: -2 },
      ]),
    ).toEqual({ lifetimeScore: 5, spendableStars: 3 });
  });
});

describe('level helpers', () => {
  it.each([
    [0, 'Giai đoạn 1'],
    [49, 'Giai đoạn 1'],
    [50, 'Giai đoạn 2'],
    [149, 'Giai đoạn 2'],
    [150, 'Giai đoạn 3'],
    [300, 'Giai đoạn 4'],
    [500, 'Giai đoạn 5'],
  ])('resolves %s points to %s', (score, expectedName) => {
    expect(resolveLevel(score)?.name).toBe(expectedName);
  });

  it('does not mutate the configured level order and finds the next level', () => {
    const definitions = [...DEFAULT_LEVEL_DEFINITIONS].reverse();
    expect(resolveLevel(175, definitions)?.name).toBe('Giai đoạn 3');
    expect(getNextLevel(175, definitions)?.name).toBe('Giai đoạn 4');
    expect(definitions[0].name).toBe('Giai đoạn 5');
  });
});
