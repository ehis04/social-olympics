// Unit tests for calculatePoints — all place + multiplier combinations and bounds.
import { describe, expect, it } from 'vitest';
import { calculatePoints } from '../../src/points/calculate-points';

describe('calculatePoints', () => {
  describe('base points at 1.0 multiplier', () => {
    it('returns 10 for 1st place', () => expect(calculatePoints(1, 1.0)).toBe(10));
    it('returns 6 for 2nd place', () => expect(calculatePoints(2, 1.0)).toBe(6));
    it('returns 3 for 3rd place', () => expect(calculatePoints(3, 1.0)).toBe(3));
    it('returns 1 for 4th place', () => expect(calculatePoints(4, 1.0)).toBe(1));
    it('returns 0.5 for 5th place', () => expect(calculatePoints(5, 1.0)).toBe(0.5));
    it('returns 0.1 for 6th place (participation)', () => expect(calculatePoints(6, 1.0)).toBe(0.1));
    it('returns 0.1 for 10th place (all 6th+ get participation)', () =>
      expect(calculatePoints(10, 1.0)).toBe(0.1));
  });

  describe('weighting multipliers applied to 1st place', () => {
    it('returns 20 for 1st place at 2.0×', () => expect(calculatePoints(1, 2.0)).toBe(20));
    it('returns 5 for 1st place at 0.5×', () => expect(calculatePoints(1, 0.5)).toBe(5));
    it('returns 15 for 1st place at 1.5×', () => expect(calculatePoints(1, 1.5)).toBe(15));
    it('returns 1 for 1st place at 0.1× (minimum)', () => expect(calculatePoints(1, 0.1)).toBe(1));
    it('returns 30 for 1st place at 3.0× (maximum)', () => expect(calculatePoints(1, 3.0)).toBe(30));
  });

  describe('multiplier bounds enforcement', () => {
    it('throws for multiplier 0.09 (below minimum)', () => {
      expect(() => calculatePoints(1, 0.09)).toThrow(RangeError);
    });
    it('throws for multiplier 3.01 (above maximum)', () => {
      expect(() => calculatePoints(1, 3.01)).toThrow(RangeError);
    });
  });
});
