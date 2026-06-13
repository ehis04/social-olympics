import { describe, it, expect, beforeAll } from 'vitest';
import { formatDate, formatRelativeTime } from '@/utils/formatters/date';

describe('formatDate', () => {
  it('formats a known date string correctly', () => {
    const result = formatDate('2026-06-12T00:00:00.000Z');
    expect(result).toContain('2026');
    expect(result).toContain('June');
    expect(result).toContain('12');
  });

  it('accepts a Date object', () => {
    const d = new Date('2026-01-01T00:00:00.000Z');
    expect(formatDate(d)).toContain('2026');
  });
});

describe('formatRelativeTime', () => {
  it('returns "just now" for a date seconds ago', () => {
    const recent = new Date(Date.now() - 10 * 1000);
    expect(formatRelativeTime(recent)).toBe('just now');
  });

  it('returns hours ago for a date 2 hours ago', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = formatRelativeTime(twoHoursAgo);
    expect(result).toMatch(/2 hours? ago/);
  });

  it('returns "yesterday" for a date 25 hours ago', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(formatRelativeTime(yesterday)).toBe('yesterday');
  });
});
