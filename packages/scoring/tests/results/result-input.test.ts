/*
 * This file verifies conversions between entered and stored result values.
 */

import { describe, expect, it } from 'vitest';
import { formatResultForInput, parseResultInput } from '../../src/results/result-input';

describe('parseResultInput', () => {
  it('reads seconds and minutes:seconds as milliseconds', () => {
    expect(parseResultInput('time', '11.40')).toBe(11400);
    expect(parseResultInput('time', '1:52.30')).toBe(112300);
    expect(parseResultInput('time', '1:02:03')).toBe(3723000);
  });

  it('rejects invalid times', () => {
    expect(parseResultInput('time', '1:75')).toBeNull();
    expect(parseResultInput('time', 'abc')).toBeNull();
    expect(parseResultInput('time', '-3')).toBeNull();
  });

  it('reads metres as centimetres and accepts a decimal comma', () => {
    expect(parseResultInput('distance', '6.32')).toBe(632);
    expect(parseResultInput('distance', '6,32')).toBe(632);
  });

  it('requires whole numbers for scores but allows decimals for weight', () => {
    expect(parseResultInput('score', '3')).toBe(3);
    expect(parseResultInput('score', '2.5')).toBeNull();
    expect(parseResultInput('weight', '82.5')).toBe(82.5);
  });

  it('returns null for empty input', () => {
    expect(parseResultInput('score', '  ')).toBeNull();
  });
});

describe('formatResultForInput', () => {
  it('round-trips stored values back to typed text', () => {
    expect(formatResultForInput('time', 11400)).toBe('11.40');
    expect(formatResultForInput('time', 112300)).toBe('1:52.30');
    expect(formatResultForInput('distance', 632)).toBe('6.32');
    expect(formatResultForInput('score', 12)).toBe('12');
    expect(formatResultForInput('score', null)).toBe('');
  });
});
