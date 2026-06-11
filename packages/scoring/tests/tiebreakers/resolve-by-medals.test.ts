// Unit tests for resolveByMedals.
import { describe, expect, it } from 'vitest';
import { resolveByMedals } from '../../src/tiebreakers/resolve-by-medals';

describe('resolveByMedals', () => {
  it('returns A when A has more gold', () => {
    expect(resolveByMedals({ profileId: 'a', gold: 3, silver: 0, bronze: 0 },
                            { profileId: 'b', gold: 2, silver: 0, bronze: 0 })).toBe('a');
  });

  it('returns B when B has more gold', () => {
    expect(resolveByMedals({ profileId: 'a', gold: 1, silver: 0, bronze: 0 },
                            { profileId: 'b', gold: 2, silver: 0, bronze: 0 })).toBe('b');
  });

  it('falls through to silver when gold is equal', () => {
    expect(resolveByMedals({ profileId: 'a', gold: 2, silver: 3, bronze: 0 },
                            { profileId: 'b', gold: 2, silver: 1, bronze: 0 })).toBe('a');
  });

  it('falls through to bronze when gold and silver are equal', () => {
    expect(resolveByMedals({ profileId: 'a', gold: 2, silver: 2, bronze: 4 },
                            { profileId: 'b', gold: 2, silver: 2, bronze: 1 })).toBe('a');
  });

  it('returns null when all medals are equal', () => {
    expect(resolveByMedals({ profileId: 'a', gold: 2, silver: 2, bronze: 2 },
                            { profileId: 'b', gold: 2, silver: 2, bronze: 2 })).toBeNull();
  });
});
