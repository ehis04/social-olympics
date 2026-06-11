// Integration test for buildLeaderboard — 5 members with varied results.
import { describe, expect, it } from 'vitest';
import { buildLeaderboard } from '../../src/leaderboard/build-leaderboard';
import type { CompetitionMemberInput } from '../../src/leaderboard/build-leaderboard';

function makeResult(id: string, points: number, isDnf = false) {
  return {
    competitionEventId: id,
    eventId: id,
    pointsAwarded: points,
    participationPoints: isDnf ? 0 : 0.1,
    bonusPoints: 0,
    isDnf,
  };
}

const members: CompetitionMemberInput[] = [
  {
    profileId: 'alice',
    results: [makeResult('e1', 10), makeResult('e2', 6), makeResult('e3', 3)],
    medalData: [{ finishingPlace: 1 }, { finishingPlace: 2 }, { finishingPlace: 3 }],
  },
  {
    profileId: 'bob',
    results: [makeResult('e1', 6), makeResult('e2', 10), makeResult('e3', 1)],
    medalData: [{ finishingPlace: 2 }, { finishingPlace: 1 }, { finishingPlace: 4 }],
  },
  {
    profileId: 'carol',
    results: [makeResult('e1', 3), makeResult('e2', 3), makeResult('e3', 6)],
    medalData: [{ finishingPlace: 3 }, { finishingPlace: 3 }, { finishingPlace: 2 }],
  },
  {
    profileId: 'dave',
    results: [makeResult('e1', 1), makeResult('e2', 1), makeResult('e3', 10)],
    medalData: [{ finishingPlace: 4 }, { finishingPlace: 4 }, { finishingPlace: 1 }],
  },
  {
    profileId: 'eve',
    results: [makeResult('e1', 0.5, true), makeResult('e2', 0.5)],
    medalData: [{ finishingPlace: null }, { finishingPlace: 5 }],
  },
];

describe('buildLeaderboard', () => {
  it('returns correct total points for each member', () => {
    const board = buildLeaderboard(members, 10);
    const aliceEntry = board.find((e) => e.profileId === 'alice')!;
    // 10.1 + 6.1 + 3.1 = 19.3
    expect(aliceEntry.totalPoints).toBeCloseTo(19.3);
  });

  it('assigns correct ranks in descending points order', () => {
    const board = buildLeaderboard(members, 10);
    const ranks = board.map((e) => ({ id: e.profileId, rank: e.rank }));
    const aliceRank = ranks.find((r) => r.id === 'alice')!.rank;
    const eveRank = ranks.find((r) => r.id === 'eve')!.rank;
    expect(aliceRank).toBeLessThan(eveRank);
  });

  it('assigns correct medal counts', () => {
    const board = buildLeaderboard(members, 10);
    const alice = board.find((e) => e.profileId === 'alice')!;
    expect(alice.gold).toBe(1);
    expect(alice.silver).toBe(1);
    expect(alice.bronze).toBe(1);
  });

  it('eventsCompleted excludes DNF results', () => {
    const board = buildLeaderboard(members, 10);
    const eve = board.find((e) => e.profileId === 'eve')!;
    expect(eve.eventsCompleted).toBe(1); // only e2 is non-DNF
  });

  it('marks tied entries correctly', () => {
    const tiedMembers: CompetitionMemberInput[] = [
      { profileId: 'p1', results: [makeResult('e1', 10)], medalData: [{ finishingPlace: 1 }] },
      { profileId: 'p2', results: [makeResult('e1', 10)], medalData: [{ finishingPlace: 1 }] },
      { profileId: 'p3', results: [makeResult('e1', 5)], medalData: [{ finishingPlace: 2 }] },
    ];
    const board = buildLeaderboard(tiedMembers, 10);
    const p1 = board.find((e) => e.profileId === 'p1')!;
    const p2 = board.find((e) => e.profileId === 'p2')!;
    const p3 = board.find((e) => e.profileId === 'p3')!;
    expect(p1.isTied).toBe(true);
    expect(p2.isTied).toBe(true);
    expect(p3.isTied).toBe(false);
    expect(p3.rank).toBe(2); // dense ranking
  });
});
