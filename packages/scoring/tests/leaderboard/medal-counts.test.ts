// Unit tests for getMedalCounts.
import { describe, expect, it } from 'vitest';
import { getMedalCounts } from '../../src/leaderboard/medal-counts';

describe('getMedalCounts', () => {
  it('counts 2 golds, 1 silver, 3 bronzes correctly', () => {
    const results = [
      { finishingPlace: 1 },
      { finishingPlace: 1 },
      { finishingPlace: 2 },
      { finishingPlace: 3 },
      { finishingPlace: 3 },
      { finishingPlace: 3 },
    ];
    expect(getMedalCounts(results)).toEqual({ gold: 2, silver: 1, bronze: 3 });
  });

  it('returns all zeros when no medals', () => {
    expect(getMedalCounts([{ finishingPlace: 4 }, { finishingPlace: 5 }])).toEqual({
      gold: 0,
      silver: 0,
      bronze: 0,
    });
  });

  it('ignores null finishingPlace entries', () => {
    expect(getMedalCounts([{ finishingPlace: null }, { finishingPlace: 1 }])).toEqual({
      gold: 1,
      silver: 0,
      bronze: 0,
    });
  });
});
