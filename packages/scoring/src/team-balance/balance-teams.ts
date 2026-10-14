/*
 * This file defines the balance teams module.
 */

// Distributes players into balanced teams using a snake draft algorithm.
import { checkBalanceTolerance } from './check-tolerance';
import { calculateTeamStrength } from './calculate-team-strength';
import { scaleUnevenTeam } from './scale-uneven-team';

export interface PlayerForBalancing {
  profileId: string;
  strengthRating: number;
}

export interface BalancingResult {
  teams: Array<{ name: string; players: PlayerForBalancing[] }>;
  teamStrengths: number[];
  withinTolerance: boolean;
  maxDifferential: number;
  disclaimer?: string;
}

// Handles balance teams.
export function balanceTeams(
  players: PlayerForBalancing[],
  teamSize: number,
  numTeams: number = Math.ceil(players.length / teamSize),
): BalancingResult {
  if (!Number.isInteger(teamSize) || teamSize < 1 || !Number.isInteger(numTeams) || numTeams < 1) {
    throw new Error('Team size and count must be positive integers');
  }
  const sorted = [...players].sort((a, b) => b.strengthRating - a.strengthRating);

  const teams: PlayerForBalancing[][] = Array.from({ length: numTeams }, () => []);

  // Snake draft: 0,1,2,...,N-1,N-1,...,1,0,0,1,...
  let direction = 1;
  let teamIndex = 0;

  for (const player of sorted) {
    const team = teams[teamIndex];
    if (team !== undefined) {
      team.push(player);
    }
    teamIndex += direction;
    if (teamIndex >= numTeams) {
      direction = -1;
      teamIndex = numTeams - 1;
    } else if (teamIndex < 0) {
      direction = 1;
      teamIndex = 0;
    }
  }

  const rawStrengths: number[] = teams.map((t) =>
    calculateTeamStrength(t.map((p) => p.strengthRating)),
  );

  // Scale uneven teams for tolerance check
  const scaledStrengths: number[] = teams.map((t, i) => {
    const raw = rawStrengths[i] ?? 0;
    return t.length < teamSize ? scaleUnevenTeam(raw, t.length, teamSize) : raw;
  });

  const tolerance = checkBalanceTolerance(scaledStrengths);

  return {
    teams: teams.map((t, i) => ({
      name: `Team ${String.fromCharCode(65 + i)}`,
      players: t,
    })),
    teamStrengths: rawStrengths,
    withinTolerance: tolerance.withinTolerance,
    maxDifferential: tolerance.maxDifferential,
    ...(tolerance.disclaimer ? { disclaimer: tolerance.disclaimer } : {}),
  };
}

export function balanceTeamsByCount(players: PlayerForBalancing[], teamCount: number): BalancingResult {
  if (!Number.isInteger(teamCount) || teamCount < 2 || teamCount > players.length) {
    throw new Error('Team count must be between 2 and the number of players');
  }
  return balanceTeams(players, Math.ceil(players.length / teamCount), teamCount);
}
