'use client';

// TeamAssignmentPanel — host configures team count and triggers balanced team assignment
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, AlertTriangle, CheckCircle, Shuffle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface RatedPlayer {
  profileId: string;
  displayName: string;
  strengthRating: number;
}

interface AssignedTeam {
  teamId: string;
  members: RatedPlayer[];
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  ratedPlayers: RatedPlayer[];
  existingTeams: AssignedTeam[] | null;
}

export function TeamAssignmentPanel({
  competitionId,
  competitionEventId,
  ratedPlayers,
  existingTeams,
}: Props) {
  const router = useRouter();
  const [teamCount, setTeamCount] = useState(2);
  const [isAssigning, setIsAssigning] = useState(false);
  const [result, setResult] = useState<{ teams: AssignedTeam[]; withinTolerance: boolean } | null>(
    existingTeams ? { teams: existingTeams, withinTolerance: true } : null,
  );

  const minTeams = 2;
  const maxTeams = Math.max(2, Math.floor(ratedPlayers.length / 2));

  async function handleAssign() {
    setIsAssigning(true);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/events/${competitionEventId}/teams`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_count: teamCount }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to assign teams');
        return;
      }
      setResult(json.data);
      toast.success('Teams assigned');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsAssigning(false);
    }
  }

  if (ratedPlayers.length < 2) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3">
        <AlertTriangle size={15} className="mt-0.5 shrink-0 text-yellow-600" />
        <p className="text-sm text-yellow-800">
          At least 2 players with confirmed strength ratings are needed to assign teams.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h3 className="text-sm font-semibold text-grey-700">Team Assignment</h3>
        </div>
        <span className="text-xs text-grey-500">{ratedPlayers.length} rated players</span>
      </div>

      {!result && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-grey-700">
              Number of teams
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={minTeams}
                max={maxTeams}
                value={teamCount}
                onChange={(e) => setTeamCount(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <span className="w-6 text-center text-sm font-bold text-grey-800">{teamCount}</span>
            </div>
            <p className="mt-1 text-xs text-grey-400">
              ~{Math.ceil(ratedPlayers.length / teamCount)} players per team
            </p>
          </div>

          <button
            onClick={handleAssign}
            disabled={isAssigning}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            <Shuffle size={15} />
            {isAssigning ? 'Assigning…' : 'Assign Balanced Teams'}
          </button>
        </div>
      )}

      {result && (
        <div className="space-y-3">
          {!result.withinTolerance && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-yellow-600" />
              <p className="text-xs text-yellow-700">
                Team strengths could not be perfectly balanced: this was the best possible assignment.
              </p>
            </div>
          )}

          {result.withinTolerance && (
            <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
              <CheckCircle size={13} className="shrink-0 text-green-600" />
              <p className="text-xs font-medium text-green-800">Teams are balanced within tolerance</p>
            </div>
          )}

          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(result.teams.length, 3)}, 1fr)` }}>
            {result.teams.map((team, i) => {
              const avgStrength =
                team.members.length > 0
                  ? team.members.reduce((sum, m) => sum + m.strengthRating, 0) / team.members.length
                  : 0;

              return (
                <div key={team.teamId} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                  <p className="mb-2 text-xs font-bold text-grey-700">
                    Team {String.fromCharCode(65 + i)}
                    <span className="ml-1.5 font-normal text-grey-400">
                      avg {avgStrength.toFixed(1)}
                    </span>
                  </p>
                  <ul className="space-y-1">
                    {team.members.map((m) => (
                      <li key={m.profileId} className="flex items-center justify-between text-xs text-grey-700">
                        <span className="truncate">{m.displayName}</span>
                        <span className="ml-2 shrink-0 font-semibold text-grey-500">{m.strengthRating}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setResult(null)}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-grey-600 hover:bg-grey-50 transition-colors"
          >
            <Shuffle size={13} />
            Re-assign teams
          </button>
        </div>
      )}
    </div>
  );
}
