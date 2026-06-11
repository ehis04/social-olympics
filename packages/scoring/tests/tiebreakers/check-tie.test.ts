// Unit tests for checkForTie.
import { describe, expect, it } from 'vitest';
import { checkForTie } from '../../src/tiebreakers/check-tie';

function makeRanked(profileId: string, rank: number, isTied: boolean) {
  return { profileId, rank, isTied, totalPoints: 0, gold: 0, silver: 0, bronze: 0 };
}

describe('checkForTie', () => {
  it('returns true when both have same rank and isTied=true', () => {
    expect(checkForTie(makeRanked('a', 1, true), makeRanked('b', 1, true))).toBe(true);
  });

  it('returns false when ranks differ', () => {
    expect(checkForTie(makeRanked('a', 1, false), makeRanked('b', 2, false))).toBe(false);
  });

  it('returns false when same rank but isTied is false on one entry', () => {
    expect(checkForTie(makeRanked('a', 1, true), makeRanked('b', 1, false))).toBe(false);
  });
});
