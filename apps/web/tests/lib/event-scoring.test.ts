/*
 * This file verifies the shared event scoring rules.
 */

import { describe, expect, it } from 'vitest';
import { rankByValue, scoreForPlace } from '@/lib/scoring/event-scoring';
import { getApiErrorMessage } from '@/lib/api/error-message';

const table = new Map([[1, 10], [2, 6], [3, 3], [4, 1], [5, 0.5]]);

describe('scoreForPlace', () => {
  it('awards the points table and participation points beyond it', () => {
    expect(scoreForPlace(1, false, table)).toEqual({ points_awarded: 10, participation_points: 0 });
    expect(scoreForPlace(5, false, table)).toEqual({ points_awarded: 0.5, participation_points: 0 });
    expect(scoreForPlace(6, false, table)).toEqual({ points_awarded: 0, participation_points: 0.1 });
  });

  it('gives nothing for DNF or unplaced results', () => {
    expect(scoreForPlace(1, true, table)).toEqual({ points_awarded: 0, participation_points: 0 });
    expect(scoreForPlace(null, false, table)).toEqual({ points_awarded: 0, participation_points: 0 });
  });
});

describe('rankByValue', () => {
  it('shares places on equal values and skips the next place', () => {
    const places = rankByValue(['a', 'b', 'c'], (id) => ({ a: 10, b: 10, c: 8 })[id]!, false);
    expect([places.get('a'), places.get('b'), places.get('c')]).toEqual([1, 1, 3]);
  });

  it('uses dense places for teams and respects lower-is-better', () => {
    const places = rankByValue(['x', 'y', 'z'], (id) => ({ x: 12000, y: 12000, z: 13000 })[id]!, true, true);
    expect([places.get('x'), places.get('y'), places.get('z')]).toEqual([1, 1, 2]);
  });
});

describe('getApiErrorMessage', () => {
  it('reads either error shape', () => {
    expect(getApiErrorMessage({ error: 'Nope' }, 'fallback')).toBe('Nope');
    expect(getApiErrorMessage({ error: { code: 'X', message: 'Denied' } }, 'fallback')).toBe('Denied');
    expect(getApiErrorMessage(null, 'fallback')).toBe('fallback');
  });
});
