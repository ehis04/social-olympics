/*
 * This file defines the TeamEventPanel user-interface component.
 */

'use client';

// TeamEventPanel — strength ratings, peer votes, team balancing and team results for team events.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Shuffle, ThumbsDown, ThumbsUp, Users } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import { formatResultValue, getResultInputConfig, parseResultInput } from '@repo/scoring';
import { getPlaceSuffix } from '@/utils/helpers/results';
import type { TeamEventState, TeamPlayer } from '@/lib/teams/team-event';

interface Props {
  competitionId: string;
  competitionEventId: string;
  state: TeamEventState;
  viewerId: string | null;
  isHost: boolean;
  isCompetitor: boolean;
  eventStatus: string;
  resultType: string;
}

const RATING_SOURCE_LABELS: Record<TeamPlayer['ratingSource'], string> = {
  historical: 'from past results',
  peer_voted: 'peer vote',
  host_set: 'set by host',
};

// Renders the team event panel component.
export function TeamEventPanel({
  competitionId,
  competitionEventId,
  state,
  viewerId,
  isHost,
  isCompetitor,
  eventStatus,
  resultType,
}: Props) {
  const router = useRouter();
  const base = `/api/competitions/${competitionId}/events/${competitionEventId}`;
  const isLive = eventStatus === 'active' || eventStatus === 'results_pending';
  const players = state.teams.length > 0 ? state.teams.flatMap((team) => team.members) : state.pool;
  const [busy, setBusy] = useState<string | null>(null);
  const [ownRating, setOwnRating] = useState(() => String(players.find((p) => p.profileId === viewerId)?.strengthRating ?? 5));
  const [hostRatings, setHostRatings] = useState<Record<string, string>>({});
  const [teamCount, setTeamCount] = useState(2);
  const [teamValues, setTeamValues] = useState<Record<string, string>>({});
  const [teamDnf, setTeamDnf] = useState<Record<string, boolean>>({});
  const config = getResultInputConfig(resultType);

  async function call(key: string, url: string, method: string, body: unknown, success: string, fallback: string) {
    setBusy(key);
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), fallback));
        return false;
      }
      toast.success(success);
      router.refresh();
      return true;
    } catch {
      toast.error('Something went wrong');
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (state.pool.length === 0 && state.teams.length === 0) {
    return (
      <section className="rounded-lg border border-grey-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-grey-700">Team assignment</h2>
        </div>
        <p className="mt-2 text-sm text-grey-500">
          {isLive
            ? isHost
              ? 'Gather the competitors into a player pool to rate and balance them into teams. Results can still be entered individually instead.'
              : 'Results for this event are being entered individually unless the host forms teams.'
            : 'When the host starts this event, players get a strength rating and are balanced into teams.'}
        </p>
        {isHost && isLive && (
          <button
            type="button"
            disabled={busy === 'pool'}
            onClick={() => void call('pool', `${base}/teams`, 'POST', { action: 'pool' }, 'Players gathered into the pool', 'Failed to gather players')}
            className="mt-3 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            <Users className="h-4 w-4" />
            {busy === 'pool' ? 'Gathering…' : 'Gather players for teams'}
          </button>
        )}
      </section>
    );
  }

  const unconfirmed = state.pool.filter((player) => !player.confirmed);
  const teamsLocked = state.teams.some((team) => team.resultValue !== null || team.resultPlace !== null);
  const sortedTeams = [...state.teams].sort((a, b) => (a.resultPlace ?? 99) - (b.resultPlace ?? 99) || a.name.localeCompare(b.name));
  const showTeamResults = isHost && isLive && state.teams.length >= 2;

  return (
    <section className="space-y-5 rounded-lg border border-grey-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-grey-700">
            {state.teams.length > 0 ? 'Teams' : 'Strength ratings and team assignment'}
          </h2>
        </div>
        <span className="text-xs text-grey-500">{players.length} players</span>
      </div>

      {state.teams.length === 0 && (
        <div className="space-y-3">
          <p className="text-xs text-grey-500">
            Each player has a strength rating from 1 to 10. Ratings from past results are accepted straight away;
            others are confirmed by a peer vote. The host then balances everyone into fair teams.
          </p>
          <ul className="divide-y divide-grey-100 rounded-lg border border-grey-100">
            {state.pool.map((player) => {
              const isSelf = player.profileId === viewerId;
              const canSetOwn = isSelf && isLive && !player.confirmed && player.votesCast === 0;
              const canVote = !isSelf && isCompetitor && isLive && !player.confirmed && !player.needsHost && !player.viewerVote;
              return (
                <li key={player.teamMemberId} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-grey-800">
                      {player.displayName}
                      {isSelf && <span className="ml-1 text-xs font-normal text-grey-400">(you)</span>}
                    </p>
                    <p className="text-xs text-grey-500">
                      Rating <span className="font-semibold text-grey-700">{player.strengthRating}/10</span>
                      {player.confirmed
                        ? ` · confirmed (${RATING_SOURCE_LABELS[player.ratingSource]})`
                        : player.needsHost
                          ? ' · disputed twice: the host will decide'
                          : ` · awaiting votes${player.round === 2 ? ' (round 2)' : ''}`}
                    </p>
                  </div>

                  {player.confirmed && <CheckCircle className="h-4 w-4 text-green-600" aria-label="Confirmed" />}

                  {canSetOwn && (
                    <div className="flex items-center gap-2">
                      <select
                        value={ownRating}
                        onChange={(e) => setOwnRating(e.target.value)}
                        aria-label="Your strength rating"
                        className="rounded-md border border-grey-300 px-2 py-1 text-sm"
                      >
                        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy === `own-${player.teamMemberId}`}
                        onClick={() => void call(
                          `own-${player.teamMemberId}`,
                          `${base}/strength-rating`,
                          'POST',
                          { self_rating: Number(ownRating) },
                          'Your rating was saved',
                          'Failed to save your rating',
                        )}
                        className="rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {canVote && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={busy === `vote-${player.teamMemberId}`}
                        onClick={() => void call(
                          `vote-${player.teamMemberId}`,
                          `${base}/strength-vote`,
                          'POST',
                          { team_member_id: player.teamMemberId, vote: 'confirm' },
                          'Vote recorded',
                          'Failed to record vote',
                        )}
                        className="flex items-center gap-1 rounded-md border border-green-300 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
                      >
                        <ThumbsUp className="h-3 w-3" />
                        Confirm rating
                      </button>
                      <button
                        type="button"
                        disabled={busy === `vote-${player.teamMemberId}`}
                        onClick={() => void call(
                          `vote-${player.teamMemberId}`,
                          `${base}/strength-vote`,
                          'POST',
                          { team_member_id: player.teamMemberId, vote: 'reject' },
                          'Vote recorded',
                          'Failed to record vote',
                        )}
                        className="flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                      >
                        <ThumbsDown className="h-3 w-3" />
                        Too high/low
                      </button>
                    </div>
                  )}

                  {!isSelf && player.viewerVote && !player.confirmed && (
                    <span className="text-xs text-grey-400">You voted {player.viewerVote === 'confirm' ? 'to confirm' : 'against'}</span>
                  )}

                  {isHost && isLive && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={hostRatings[player.teamMemberId] ?? ''}
                        placeholder={String(player.strengthRating)}
                        onChange={(e) => setHostRatings((current) => ({ ...current, [player.teamMemberId]: e.target.value }))}
                        aria-label={`Set rating for ${player.displayName}`}
                        className="w-16 rounded-md border border-grey-300 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        disabled={!hostRatings[player.teamMemberId] || busy === `host-${player.teamMemberId}`}
                        onClick={() => void call(
                          `host-${player.teamMemberId}`,
                          `${base}/strength-rating`,
                          'PATCH',
                          { team_member_id: player.teamMemberId, rating: Number(hostRatings[player.teamMemberId]) },
                          `${player.displayName}'s rating was set`,
                          'Failed to set rating',
                        )}
                        className="rounded-md border border-grey-200 px-2 py-1 text-xs font-semibold text-grey-700 hover:bg-grey-50 disabled:opacity-40"
                      >
                        Set
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {isHost && isLive && state.pool.length >= 2 && (
            <div className="space-y-3 rounded-lg border border-grey-100 bg-grey-50 p-4">
              <label className="block text-xs font-semibold text-grey-700">
                Number of teams: <span className="text-grey-900">{teamCount}</span>
                <input
                  type="range"
                  min={2}
                  max={state.pool.length}
                  value={teamCount}
                  onChange={(e) => setTeamCount(Number(e.target.value))}
                  className="mt-2 w-full accent-primary"
                />
              </label>
              <p className="text-xs text-grey-500">
                About {Math.ceil(state.pool.length / teamCount)} players per team.
                {unconfirmed.length > 0 && ` ${unconfirmed.length} rating${unconfirmed.length === 1 ? ' is' : 's are'} not confirmed yet and will be used as they are.`}
              </p>
              <button
                type="button"
                disabled={busy === 'pool'}
                onClick={() => void call('pool', `${base}/teams`, 'POST', { action: 'pool' }, 'Player pool updated', 'Failed to update the pool')}
                className="text-xs font-semibold text-primary hover:underline disabled:opacity-60"
              >
                Add competitors who joined late
              </button>
              <button
                type="button"
                disabled={busy === 'assign'}
                onClick={() => void call('assign', `${base}/teams`, 'POST', { team_count: teamCount }, 'Teams assigned', 'Failed to assign teams')}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
              >
                <Shuffle className="h-4 w-4" />
                {busy === 'assign' ? 'Balancing…' : 'Balance teams'}
              </button>
            </div>
          )}
        </div>
      )}

      {state.teams.length > 0 && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedTeams.map((team) => {
              const total = team.members.reduce((sum, member) => sum + member.strengthRating, 0);
              return (
                <div key={team.teamId} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-bold text-grey-800">
                      {team.resultPlace != null && (
                        <span className="mr-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {getPlaceSuffix(team.resultPlace)}
                        </span>
                      )}
                      {team.name}
                    </p>
                    <span className="text-xs text-grey-500">
                      {team.resultValue != null
                        ? formatResultValue(team.resultValue, resultType)
                        : `strength ${total.toFixed(1)}`}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {team.members.map((member) => (
                      <li key={member.teamMemberId} className="flex justify-between text-xs text-grey-700">
                        <span className="truncate">
                          {member.displayName}
                          {member.profileId === viewerId && <span className="text-grey-400"> (you)</span>}
                        </span>
                        <span className="ml-2 font-semibold text-grey-500">{member.strengthRating}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {showTeamResults && (
            <div className="space-y-3 rounded-lg border border-grey-100 bg-grey-50 p-4">
              <h3 className="text-sm font-semibold text-grey-800">Record team results</h3>
              <p className="text-xs text-grey-500">
                Enter each team&apos;s {config.label.toLowerCase()}. Every player shares their team&apos;s place and points.
              </p>
              {state.teams.map((team) => (
                <div key={team.teamId} className="flex flex-wrap items-center gap-3">
                  <span className="w-24 text-sm font-semibold text-grey-800">{team.name}</span>
                  <input
                    type="text"
                    inputMode={config.inputMode}
                    value={teamValues[team.teamId] ?? ''}
                    disabled={teamDnf[team.teamId]}
                    onChange={(e) => setTeamValues((current) => ({ ...current, [team.teamId]: e.target.value }))}
                    placeholder={config.placeholder}
                    aria-label={`${config.label} for ${team.name}`}
                    className="w-32 rounded-md border border-grey-300 px-2 py-1.5 text-sm disabled:bg-grey-100"
                  />
                  {config.unit && <span className="text-xs text-grey-500">{config.unit}</span>}
                  <label className="flex items-center gap-1 text-xs text-grey-600">
                    <input
                      type="checkbox"
                      checked={!!teamDnf[team.teamId]}
                      onChange={(e) => setTeamDnf((current) => ({ ...current, [team.teamId]: e.target.checked }))}
                    />
                    DNF
                  </label>
                </div>
              ))}
              <div className="flex flex-wrap justify-between gap-2">
                {!teamsLocked && (
                  <button
                    type="button"
                    disabled={busy === 'assign'}
                    onClick={() => void call('assign', `${base}/teams`, 'POST', { team_count: state.teams.length }, 'Teams re-balanced', 'Failed to re-balance teams')}
                    className="flex items-center gap-1.5 rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-600 hover:bg-white"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Re-balance teams
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy === 'results'}
                  onClick={() => {
                    const results = state.teams.map((team) => ({
                      team_id: team.teamId,
                      is_dnf: !!teamDnf[team.teamId],
                      value: teamDnf[team.teamId] ? null : parseResultInput(resultType, teamValues[team.teamId] ?? ''),
                    }));
                    if (results.some((entry) => !entry.is_dnf && entry.value === null)) {
                      toast.error(`Enter a valid ${config.label.toLowerCase()} for every team, or mark it as DNF`);
                      return;
                    }
                    void call('results', `${base}/team-results`, 'POST', { results }, 'Team results confirmed', 'Failed to record team results');
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  {busy === 'results' ? 'Saving…' : 'Confirm team results'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
