/*
 * This file verifies standings ranking and tie detection.
 */

import { describe, expect, it } from 'vitest';
import { groupTies, rankStandings } from '../../src/leaderboard/standings';

const entry = (profile_id: string, total_points: number, gold = 0, silver = 0, bronze = 0) =>
  ({ profile_id, total_points, gold_count: gold, silver_count: silver, bronze_count: bronze });

describe('rankStandings', () => {
  it('orders by points then medals with dense ranks', () => {
    const ranked = rankStandings([entry('a', 10, 1), entry('b', 10, 2), entry('c', 5)]);
    expect(ranked.map((r) => [r.profile_id, r.rank])).toEqual([['b', 1], ['a', 2], ['c', 3]]);
    expect(ranked.every((r) => !r.isTied)).toBe(true);
  });

  it('flags a tie only when points and medals are level', () => {
    const ranked = rankStandings([entry('a', 10, 1), entry('b', 10, 1), entry('c', 5)]);
    expect(ranked.filter((r) => r.isTied).map((r) => r.profile_id).sort()).toEqual(['a', 'b']);
    expect(ranked.find((r) => r.profile_id === 'c')?.rank).toBe(2);
    expect(groupTies(ranked)).toHaveLength(1);
  });

  it('does not treat everyone on zero as tied', () => {
    const ranked = rankStandings([entry('a', 0), entry('b', 0)]);
    expect(ranked.some((r) => r.isTied)).toBe(false);
  });
});
