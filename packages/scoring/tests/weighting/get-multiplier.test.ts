// Unit tests for getWeightMultiplier — all preset tags and custom bounds.
import { describe, expect, it } from 'vitest';
import { getWeightMultiplier } from '../../src/weighting/get-multiplier';

describe('getWeightMultiplier', () => {
  describe('preset tags', () => {
    it('not_important → 0.5', () => expect(getWeightMultiplier('not_important')).toBe(0.5));
    it('standard → 1.0', () => expect(getWeightMultiplier('standard')).toBe(1.0));
    it('important → 1.5', () => expect(getWeightMultiplier('important')).toBe(1.5));
    it('very_important → 2.0', () => expect(getWeightMultiplier('very_important')).toBe(2.0));
  });

  describe('custom multiplier', () => {
    it('returns 1.8 for custom 1.8', () => expect(getWeightMultiplier('custom', 1.8)).toBe(1.8));
    it('returns 0.1 at minimum boundary', () => expect(getWeightMultiplier('custom', 0.1)).toBe(0.1));
    it('returns 3.0 at maximum boundary', () => expect(getWeightMultiplier('custom', 3.0)).toBe(3.0));
    it('throws when custom has no multiplier', () => {
      expect(() => getWeightMultiplier('custom')).toThrow();
    });
    it('throws for 0.09 (below minimum)', () => {
      expect(() => getWeightMultiplier('custom', 0.09)).toThrow(RangeError);
    });
    it('throws for 3.01 (above maximum)', () => {
      expect(() => getWeightMultiplier('custom', 3.01)).toThrow(RangeError);
    });
  });
});
