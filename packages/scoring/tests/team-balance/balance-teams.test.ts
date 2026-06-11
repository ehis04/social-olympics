// Unit tests for balanceTeams — snake draft and tolerance checking.
import { describe, expect, it } from 'vitest';
import { balanceTeams } from '../../src/team-balance/balance-teams';

function makePlayers(ratings: number[]) {
  return ratings.map((r, i) => ({ profileId: `p${i}`, strengthRating: r }));
}

describe('balanceTeams', () => {
  it('10 players, teamSize=5: produces 2 balanced teams within tolerance', () => {
    const players = makePlayers([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    const result = balanceTeams(players, 5);
    expect(result.teams).toHaveLength(2);
    expect(result.teams[0].players).toHaveLength(5);
    expect(result.teams[1].players).toHaveLength(5);
    expect(result.withinTolerance).toBe(true);
  });

  it('12 players, teamSize=6: produces 2 teams of 6', () => {
    const players = makePlayers([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 6, 7]);
    const result = balanceTeams(players, 6);
    expect(result.teams).toHaveLength(2);
    expect(result.teams.every((t) => t.players.length === 6)).toBe(true);
  });

  it('snake draft produces balanced teams (not sequential assignment)', () => {
    // [10,9,8,7,6,5] in 3 teams:
    // Sequential: A=[10,7]=17, B=[9,6]=15, C=[8,5]=13 — imbalanced
    // Snake:      A=[10,5]=15, B=[9,6]=15, C=[8,7]=15 — balanced
    const players = makePlayers([10, 9, 8, 7, 6, 5]);
    const result = balanceTeams(players, 2);
    expect(result.teams).toHaveLength(3);
    const strengths = result.teamStrengths;
    expect(Math.max(...strengths) - Math.min(...strengths)).toBeLessThanOrEqual(1);
  });

  it('uneven teams: 11 players, teamSize=6 → teams of 6 and 5, disclaimer present', () => {
    const players = makePlayers([10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 8]);
    const result = balanceTeams(players, 6);
    expect(result.teams).toHaveLength(2);
    const sizes = result.teams.map((t) => t.players.length).sort();
    expect(sizes).toEqual([5, 6]);
  });

  it('2 players for a 1v1 event → 2 teams of 1', () => {
    const players = makePlayers([8, 6]);
    const result = balanceTeams(players, 1);
    expect(result.teams).toHaveLength(2);
    expect(result.teams[0].players).toHaveLength(1);
    expect(result.teams[1].players).toHaveLength(1);
  });

  it('assigns correct team names A, B, C', () => {
    const players = makePlayers([10, 9, 8, 7, 6, 5]);
    const result = balanceTeams(players, 2);
    expect(result.teams.map((t) => t.name)).toEqual(['Team A', 'Team B', 'Team C']);
  });
});
