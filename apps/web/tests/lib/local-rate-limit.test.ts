import { afterEach, describe, expect, it, vi } from 'vitest';
import { createLocalLimiter } from '@/lib/local-rate-limit';

afterEach(() => { vi.useRealTimers(); });

describe('local rate limiter', () => {
  it('limits each identifier separately and restores capacity after the window', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const limiter = createLocalLimiter(2, 500);
    expect((await limiter.limit('a')).success).toBe(true);
    expect((await limiter.limit('a')).success).toBe(true);
    expect(await limiter.limit('a')).toEqual({ success: false, reset: 1500 });
    expect((await limiter.limit('b')).success).toBe(true);
    vi.advanceTimersByTime(500);
    expect((await limiter.limit('a')).success).toBe(true);
  });
});
