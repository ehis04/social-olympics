// Unit tests for applyMvpBonus and applyWorstPerformerPenalty.
import { describe, expect, it } from 'vitest';
import { applyMvpBonus, applyWorstPerformerPenalty } from '../../src/points/apply-bonuses';

describe('applyMvpBonus', () => {
  it('adds 1 to 10', () => expect(applyMvpBonus(10)).toBe(11));
  it('adds 1 to 0.1', () => expect(applyMvpBonus(0.1)).toBeCloseTo(1.1));
  it('adds 1 to 0', () => expect(applyMvpBonus(0)).toBe(1));
});

describe('applyWorstPerformerPenalty', () => {
  it('subtracts 1 from 3', () => expect(applyWorstPerformerPenalty(3)).toBe(2));
  it('results in -0.9 for 0.1 (negative is valid)', () =>
    expect(applyWorstPerformerPenalty(0.1)).toBeCloseTo(-0.9));
  it('results in -1 for 0', () => expect(applyWorstPerformerPenalty(0)).toBe(-1));
});
