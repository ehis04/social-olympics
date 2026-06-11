// Unit tests for processBidRound.
import { describe, expect, it } from 'vitest';
import { processBidRound } from '../../src/weightlifting/process-bid-round';

function makeBid(profileId: string, status: 'success' | 'fail' | 'pending' | 'withdrawn') {
  return { profileId, bidWeightKg: 100, attemptStatus: status as any };
}

describe('processBidRound', () => {
  it('3 succeed, 2 fail → 2 eliminated, 3 advancing', () => {
    const bids = [
      makeBid('a', 'success'),
      makeBid('b', 'success'),
      makeBid('c', 'success'),
      makeBid('d', 'fail'),
      makeBid('e', 'fail'),
    ];
    const result = processBidRound(bids);
    expect(result.eliminated).toHaveLength(2);
    expect(result.advancing).toHaveLength(3);
    expect(result.eliminated).toContain('d');
    expect(result.eliminated).toContain('e');
  });

  it('all succeed → nobody eliminated', () => {
    const bids = [makeBid('a', 'success'), makeBid('b', 'success')];
    const result = processBidRound(bids);
    expect(result.eliminated).toHaveLength(0);
    expect(result.advancing).toHaveLength(2);
  });

  it('all fail → all eliminated', () => {
    const bids = [makeBid('a', 'fail'), makeBid('b', 'fail')];
    const result = processBidRound(bids);
    expect(result.eliminated).toHaveLength(2);
    expect(result.advancing).toHaveLength(0);
  });

  it('throws when any bid is pending', () => {
    const bids = [makeBid('a', 'success'), makeBid('b', 'pending')];
    expect(() => processBidRound(bids)).toThrow();
  });

  it('single competitor succeeds → still advancing', () => {
    const bids = [makeBid('a', 'success')];
    const result = processBidRound(bids);
    expect(result.advancing).toContain('a');
    expect(result.eliminated).toHaveLength(0);
  });
});
