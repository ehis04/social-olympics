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

export function balanceTeams(
  players: PlayerForBalancing[],
  teamSize: number,
): BalancingResult {
  const numTeams = Math.ceil(players.length / teamSize);
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
