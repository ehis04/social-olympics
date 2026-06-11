// Unit tests for calculateBestOf.
import { describe, expect, it } from 'vitest';
import { calculateBestOf } from '../../src/best-of/calculate-best-of';

function makeResult(eventId: string, totalPoints: number, isDnf = false) {
  return { eventId, totalPoints, isDnf };
}

describe('calculateBestOf', () => {
  it('returns top 10 from 15 results', () => {
    const results = Array.from({ length: 15 }, (_, i) =>
      makeResult(`e${i}`, 15 - i),
    );
    const best = calculateBestOf(results, 10);
    expect(best).toHaveLength(10);
    expect(best[0].totalPoints).toBe(15);
    expect(best[9].totalPoints).toBe(6);
  });

  it('results with equal points are both eligible for top N', () => {
    const results = [
      makeResult('e1', 10),
      makeResult('e2', 10),
      makeResult('e3', 5),
    ];
    const best = calculateBestOf(results, 2);
    expect(best).toHaveLength(2);
    expect(best.every((r) => r.totalPoints === 10)).toBe(true);
  });

  it('returns all 8 when fewer than N available', () => {
    const results = Array.from({ length: 8 }, (_, i) => makeResult(`e${i}`, i + 1));
    expect(calculateBestOf(results, 10)).toHaveLength(8);
  });

  it('returns empty array when all results are DNF', () => {
    const results = [makeResult('e1', 10, true), makeResult('e2', 6, true)];
    expect(calculateBestOf(results, 10)).toHaveLength(0);
  });

  it('excludes DNFs and returns best 3 non-DNF', () => {
    const results = [
      makeResult('e1', 10),
      makeResult('e2', 6, true),
      makeResult('e3', 3),
      makeResult('e4', 1),
      makeResult('e5', 0.5, true),
    ];
    const best = calculateBestOf(results, 3);
    expect(best).toHaveLength(3);
    expect(best.map((r) => r.eventId)).toEqual(['e1', 'e3', 'e4']);
  });

  it('returns empty array for n=0', () => {
    const results = [makeResult('e1', 10)];
    expect(calculateBestOf(results, 0)).toHaveLength(0);
  });

  it('does not mutate the original array', () => {
    const results = [makeResult('e1', 3), makeResult('e2', 10)];
    const copy = [...results];
    calculateBestOf(results, 2);
    expect(results).toEqual(copy);
  });
});
