// Unit tests for validateCustomMultiplier.
import { describe, expect, it } from 'vitest';
import { validateCustomMultiplier } from '../../src/weighting/validate-multiplier';

describe('validateCustomMultiplier', () => {
  it('0.1 → true (minimum boundary)', () => expect(validateCustomMultiplier(0.1)).toBe(true));
  it('3.0 → true (maximum boundary)', () => expect(validateCustomMultiplier(3.0)).toBe(true));
  it('1.5 → true (mid-range)', () => expect(validateCustomMultiplier(1.5)).toBe(true));
  it('0.09 → false (below minimum)', () => expect(validateCustomMultiplier(0.09)).toBe(false));
  it('3.01 → false (above maximum)', () => expect(validateCustomMultiplier(3.01)).toBe(false));
  it('0 → false', () => expect(validateCustomMultiplier(0)).toBe(false));
  it('-1 → false', () => expect(validateCustomMultiplier(-1)).toBe(false));
});
