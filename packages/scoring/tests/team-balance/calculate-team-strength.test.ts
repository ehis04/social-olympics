// Unit tests for calculateTeamStrength.
import { describe, expect, it } from 'vitest';
import { calculateTeamStrength } from '../../src/team-balance/calculate-team-strength';

describe('calculateTeamStrength', () => {
  it('sums an array of ratings', () => expect(calculateTeamStrength([7, 8, 6, 5])).toBe(26));
  it('returns 0 for empty array', () => expect(calculateTeamStrength([])).toBe(0));
  it('returns the single rating for a one-player team', () =>
    expect(calculateTeamStrength([7])).toBe(7));
});
