// Unit tests for countEligibleResults.
import { describe, expect, it } from 'vitest';
import { countEligibleResults } from '../../src/best-of/count-eligible';

describe('countEligibleResults', () => {
  it('returns total count when all valid', () => {
    expect(countEligibleResults([{ isDnf: false }, { isDnf: false }])).toBe(2);
  });
  it('returns 0 when all DNF', () => {
    expect(countEligibleResults([{ isDnf: true }, { isDnf: true }])).toBe(0);
  });
  it('returns count of non-DNF only in mixed set', () => {
    expect(
      countEligibleResults([{ isDnf: false }, { isDnf: true }, { isDnf: false }]),
    ).toBe(2);
  });
});
