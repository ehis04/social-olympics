// Unit tests for getHistoricalRating — relative performance and similarity group inference.
import { describe, expect, it } from 'vitest';
import { getHistoricalRating } from '../../src/team-balance/get-historical-rating';
import type { HistoricalResult } from '../../src/team-balance/get-historical-rating';

function timeResult(profileId: string, slug: string, ms: number): HistoricalResult {
  return { profileId, eventSlug: slug, resultValuePrimary: ms, resultType: 'time' };
}
function scoreResult(profileId: string, slug: string, pts: number): HistoricalResult {
  return { profileId, eventSlug: slug, resultValuePrimary: pts, resultType: 'score' };
}

describe('getHistoricalRating', () => {
  it('best performer in field → rating near 10', () => {
    const results = [
      timeResult('alice', '100m-sprint', 10000),  // fastest
      timeResult('bob', '100m-sprint', 11000),
      timeResult('carol', '100m-sprint', 12000),
      timeResult('dave', '100m-sprint', 13000),
      timeResult('eve', '100m-sprint', 14000),    // slowest
    ];
    const rating = getHistoricalRating('alice', '100m-sprint', results);
    expect(rating).not.toBeNull();
    expect(rating!).toBeGreaterThanOrEqual(9);
  });

  it('worst performer in field → rating near 1', () => {
    const results = [
      timeResult('alice', '100m-sprint', 10000),
      timeResult('bob', '100m-sprint', 11000),
      timeResult('carol', '100m-sprint', 12000),
      timeResult('dave', '100m-sprint', 13000),
      timeResult('eve', '100m-sprint', 14000),
    ];
    const rating = getHistoricalRating('eve', '100m-sprint', results);
    expect(rating).not.toBeNull();
    expect(rating!).toBeLessThanOrEqual(2);
  });

  it('average performer → rating near 5', () => {
    const results = [
      timeResult('alice', '100m-sprint', 10000),
      timeResult('mid', '100m-sprint', 12000),   // middle of 10-14 range
      timeResult('eve', '100m-sprint', 14000),
    ];
    const rating = getHistoricalRating('mid', '100m-sprint', results);
    expect(rating).not.toBeNull();
    expect(rating!).toBeGreaterThanOrEqual(4);
    expect(rating!).toBeLessThanOrEqual(6);
  });

  it('returns null when profile has no history in event or group', () => {
    const results = [timeResult('alice', '100m-sprint', 10000)];
    expect(getHistoricalRating('unknown', '100m-sprint', results)).toBeNull();
  });

  it('returns 5 when profile is only participant in past event', () => {
    const results = [timeResult('alice', '100m-sprint', 10000)];
    expect(getHistoricalRating('alice', '100m-sprint', results)).toBe(5);
  });

  it('cross-event inference: 200m result used when querying 100m sprint (same group)', () => {
    const results = [
      timeResult('alice', '200m-sprint', 20000),  // fastest 200m
      timeResult('bob', '200m-sprint', 25000),
      timeResult('carol', '200m-sprint', 30000),  // slowest
    ];
    // alice has no 100m-sprint result but has 200m-sprint which is in the sprint group
    const rating = getHistoricalRating('alice', '100m-sprint', results);
    expect(rating).not.toBeNull();
    expect(rating!).toBeGreaterThanOrEqual(9); // best in group
  });

  it('standalone event: only exact slug matches count (no cross-inference)', () => {
    const results = [
      scoreResult('alice', 'football-1v1', 10),  // football — different standalone
      scoreResult('bob', 'football-1v1', 5),
    ];
    // golf is standalone — football results should not inform it
    expect(getHistoricalRating('alice', 'golf', results)).toBeNull();
  });
});
