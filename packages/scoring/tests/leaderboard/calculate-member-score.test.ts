// Unit tests for calculateMemberScore.
import { describe, expect, it } from 'vitest';
import { calculateMemberScore } from '../../src/leaderboard/calculate-member-score';
import type { MemberEventResult } from '../../src/leaderboard/calculate-member-score';

function makeResult(
  id: string,
  pointsAwarded: number,
  opts: { participation?: number; bonus?: number; isDnf?: boolean } = {},
): MemberEventResult {
  return {
    competitionEventId: id,
    eventId: id,
    pointsAwarded,
    participationPoints: opts.participation ?? 0.1,
    bonusPoints: opts.bonus ?? 0,
    isDnf: opts.isDnf ?? false,
  };
}

describe('calculateMemberScore', () => {
  it('sums all 10 results when n=10', () => {
    const results = Array.from({ length: 10 }, (_, i) => makeResult(`e${i}`, i + 1));
    const total = results.reduce((s, r) => s + r.pointsAwarded + 0.1, 0);
    expect(calculateMemberScore(results, 10)).toBeCloseTo(total);
  });

  it('sums only the best 10 of 15 results', () => {
    const results = Array.from({ length: 15 }, (_, i) =>
      makeResult(`e${i}`, 15 - i, { participation: 0 }),
    );
    const score = calculateMemberScore(results, 10);
    // best 10: points 15,14,13,12,11,10,9,8,7,6 = 105
    expect(score).toBe(105);
  });

  it('excludes DNF events from best-of selection', () => {
    const results = [
      makeResult('e1', 10, { participation: 0 }),
      makeResult('e2', 6, { participation: 0, isDnf: true }),
      makeResult('e3', 3, { participation: 0 }),
    ];
    // DNF e2 excluded — only e1+e3 counted
    expect(calculateMemberScore(results, 10)).toBe(13);
  });

  it('MVP bonus is included in event total before best-of selection', () => {
    const results = [
      makeResult('e1', 10, { participation: 0, bonus: 1 }),
      makeResult('e2', 6, { participation: 0 }),
    ];
    // e1 total = 11, e2 total = 6
    expect(calculateMemberScore(results, 2)).toBe(17);
  });

  it('sums all 5 results when fewer than N available', () => {
    const results = Array.from({ length: 5 }, (_, i) =>
      makeResult(`e${i}`, i + 1, { participation: 0 }),
    );
    expect(calculateMemberScore(results, 10)).toBe(15);
  });

  it('returns 0 when all results are DNF', () => {
    const results = [
      makeResult('e1', 10, { isDnf: true }),
      makeResult('e2', 6, { isDnf: true }),
    ];
    expect(calculateMemberScore(results, 10)).toBe(0);
  });
});
