// Unit tests for checkBalanceTolerance.
import { describe, expect, it } from 'vitest';
import { checkBalanceTolerance } from '../../src/team-balance/check-tolerance';

describe('checkBalanceTolerance', () => {
  it('within tolerance when max diff is 2', () => {
    const result = checkBalanceTolerance([25, 27, 26]);
    expect(result.withinTolerance).toBe(true);
    expect(result.maxDifferential).toBe(2);
    expect(result.disclaimer).toBeUndefined();
  });

  it('outside tolerance when max diff is 4', () => {
    const result = checkBalanceTolerance([25, 29]);
    expect(result.withinTolerance).toBe(false);
    expect(result.maxDifferential).toBe(4);
    expect(result.disclaimer).toBeDefined();
  });

  it('within tolerance when all teams equal', () => {
    const result = checkBalanceTolerance([30, 30, 30]);
    expect(result.withinTolerance).toBe(true);
    expect(result.maxDifferential).toBe(0);
  });

  it('single team is always within tolerance', () => {
    const result = checkBalanceTolerance([25]);
    expect(result.withinTolerance).toBe(true);
    expect(result.maxDifferential).toBe(0);
  });
});
