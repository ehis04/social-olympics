// Unit tests for rankEntries — dense ranking and tie detection.
import { describe, expect, it } from 'vitest';
import { rankEntries } from '../../src/leaderboard/rank-entries';

function makeEntry(profileId: string, totalPoints: number, gold = 0, silver = 0, bronze = 0) {
  return { profileId, totalPoints, gold, silver, bronze };
}

describe('rankEntries', () => {
  it('assigns ranks 1-5 with no ties for distinct points', () => {
    const entries = [
      makeEntry('a', 50),
      makeEntry('b', 40),
      makeEntry('c', 30),
      makeEntry('d', 20),
      makeEntry('e', 10),
    ];
    const ranked = rankEntries(entries);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(ranked.every((r) => !r.isTied)).toBe(true);
  });

  it('two players tied for 1st → both rank 1, next player is rank 2 (dense)', () => {
    const entries = [makeEntry('a', 50), makeEntry('b', 50), makeEntry('c', 30)];
    const ranked = rankEntries(entries);
    const [a, b, c] = ranked;
    expect(a.rank).toBe(1);
    expect(b.rank).toBe(1);
    expect(a.isTied).toBe(true);
    expect(b.isTied).toBe(true);
    expect(c.rank).toBe(2); // dense — NOT rank 3
    expect(c.isTied).toBe(false);
  });

  it('three players tied → all rank 1, next is rank 2', () => {
    const entries = [
      makeEntry('a', 50),
      makeEntry('b', 50),
      makeEntry('c', 50),
      makeEntry('d', 20),
    ];
    const ranked = rankEntries(entries);
    expect(ranked.filter((r) => r.rank === 1)).toHaveLength(3);
    expect(ranked.find((r) => r.profileId === 'd')?.rank).toBe(2);
  });

  it('uses gold count as display sort within tied points', () => {
    const entries = [makeEntry('a', 50, 1), makeEntry('b', 50, 3)];
    const ranked = rankEntries(entries);
    expect(ranked[0].profileId).toBe('b'); // more golds sorts first
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].rank).toBe(1);
  });

  it('returns empty array for empty input', () => {
    expect(rankEntries([])).toEqual([]);
  });
});
