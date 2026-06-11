// Unit tests for scaleUnevenTeam.
import { describe, expect, it } from 'vitest';
import { scaleUnevenTeam } from '../../src/team-balance/scale-uneven-team';

describe('scaleUnevenTeam', () => {
  it('scales team of 5 scoring 35 to standard size 6 → 42', () => {
    // 35 / (5×10) × (6×10) = 35/50 × 60 = 42
    expect(scaleUnevenTeam(35, 5, 6)).toBeCloseTo(42);
  });

  it('returns unchanged strength when team sizes match', () => {
    expect(scaleUnevenTeam(36, 6, 6)).toBe(36);
  });

  it('proportionally scales correctly', () => {
    // 3-player team scoring 21 in a 4-player game: 21/30 × 40 = 28
    expect(scaleUnevenTeam(21, 3, 4)).toBeCloseTo(28);
  });
});
