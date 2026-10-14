/*
 * This file defines the TeamLeaderboard user-interface component.
 */

// TeamLeaderboard — aggregated team results across all confirmed team events
import { formatPoints } from '@/utils/formatters/points';
interface TeamEntry {
  team_id: string;
  team_name: string;
  members: string[];
  events_played?: number;
  events_won: number;
  total_points: number;
  rank: number;
}

interface Props {
  teams: TeamEntry[];
}

// Renders the team leaderboard component.
export function TeamLeaderboard({ teams }: Props) {
  if (teams.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-10 text-center">
        <p className="text-sm text-grey-500">No team results yet. Team standings appear once a team event is confirmed.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-grey-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-grey-200 bg-grey-50 text-left text-xs font-semibold uppercase tracking-wide text-grey-500">
            <th className="px-4 py-3 w-12">Rank</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3 hidden sm:table-cell">Members</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Played</th>
            <th className="px-4 py-3 text-right">Won</th>
            <th className="px-4 py-3 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {teams.map((team) => (
            <tr key={team.team_id} className="hover:bg-grey-50 transition-colors">
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-semibold text-grey-700">{team.rank}</span>
              </td>
              <td className="px-4 py-3 font-medium text-grey-900">{team.team_name}</td>
              <td className="px-4 py-3 hidden sm:table-cell text-grey-600 text-xs">
                {team.members.join(', ')}
              </td>
              <td className="px-4 py-3 text-right text-grey-700 hidden sm:table-cell">{team.events_played ?? 1}</td>
              <td className="px-4 py-3 text-right text-grey-700">{team.events_won}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-grey-900">
                {formatPoints(team.total_points)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}