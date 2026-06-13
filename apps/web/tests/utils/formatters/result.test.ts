import { describe, it, expect } from 'vitest';
import { formatResultValue } from '@/utils/formatters/result';

describe('formatResultValue', () => {
  it('formats time under 60s in seconds', () => {
    expect(formatResultValue(11400, 'time')).toBe('11.40s');
  });

  it('formats time over 60s as MM:SS.ms', () => {
    expect(formatResultValue(75000, 'time')).toBe('1:15.00');
  });

  it('formats distance from cm to metres', () => {
    expect(formatResultValue(632, 'distance')).toBe('6.32m');
  });

  it('formats score as plain number', () => {
    expect(formatResultValue(3, 'score')).toBe('3');
  });

  it('formats inverted_score as plain number', () => {
    expect(formatResultValue(72, 'inverted_score')).toBe('72');
  });

  it('formats weight with 2dp and kg suffix', () => {
    expect(formatResultValue(100, 'weight')).toBe('100.00kg');
  });

  it('formats compound as reps', () => {
    expect(formatResultValue(12, 'compound')).toBe('12 reps');
  });

  it('formats possession as pts', () => {
    expect(formatResultValue(8, 'possession')).toBe('8 pts');
  });
});
