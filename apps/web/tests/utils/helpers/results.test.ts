import { describe, it, expect } from 'vitest';
import { getPlaceSuffix, canSubmitResult } from '@/utils/helpers/results';

describe('getPlaceSuffix', () => {
  it('returns 1st', () => expect(getPlaceSuffix(1)).toBe('1st'));
  it('returns 2nd', () => expect(getPlaceSuffix(2)).toBe('2nd'));
  it('returns 3rd', () => expect(getPlaceSuffix(3)).toBe('3rd'));
  it('returns 4th', () => expect(getPlaceSuffix(4)).toBe('4th'));
  it('returns 11th (teen exception)', () => expect(getPlaceSuffix(11)).toBe('11th'));
  it('returns 12th (teen exception)', () => expect(getPlaceSuffix(12)).toBe('12th'));
  it('returns 13th (teen exception)', () => expect(getPlaceSuffix(13)).toBe('13th'));
  it('returns 21st', () => expect(getPlaceSuffix(21)).toBe('21st'));
  it('returns 22nd', () => expect(getPlaceSuffix(22)).toBe('22nd'));
  it('returns 101st', () => expect(getPlaceSuffix(101)).toBe('101st'));
});

describe('canSubmitResult', () => {
  it('returns true for competitor with active event', () => {
    expect(canSubmitResult('competitor', 'active')).toBe(true);
  });

  it('returns true for host with active event', () => {
    expect(canSubmitResult('host', 'active')).toBe(true);
  });

  it('returns false for spectator', () => {
    expect(canSubmitResult('spectator', 'active')).toBe(false);
  });

  it('returns false for competitor with non-active event', () => {
    expect(canSubmitResult('competitor', 'results_pending')).toBe(false);
  });
});
