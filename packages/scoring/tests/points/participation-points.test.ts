// Unit tests for getParticipationPoints.
import { describe, expect, it } from 'vitest';
import { getParticipationPoints } from '../../src/points/participation-points';

describe('getParticipationPoints', () => {
  it('returns 0.1 when isDnf is false', () => expect(getParticipationPoints(false)).toBe(0.1));
  it('returns 0 when isDnf is true', () => expect(getParticipationPoints(true)).toBe(0));
});
