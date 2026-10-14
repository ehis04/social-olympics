/*
 * This file defines the TeamEventPanel user-interface component.
 */

// TeamEventPanel — strength ratings, peer votes, team balancing and team results for team events.
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch, ActivityIndicator } from 'react-native';
import { CheckCircle, Shuffle, ThumbsDown, ThumbsUp, Users, Minus, Plus } from 'lucide-react-native';
import { formatResultValue, getResultInputConfig, parseResultInput } from '@repo/scoring';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { formatPlace } from '@/utils/formatters/result';

export interface TeamPlayer {
  teamMemberId: string;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  strengthRating: number;
  ratingSource: 'historical' | 'peer_voted' | 'host_set';
  confirmed: boolean;
  round: 1 | 2;
  needsHost: boolean;
  viewerVote: 'confirm' | 'reject' | null;
  votesCast: number;
}

export interface TeamEventState {
  pool: TeamPlayer[];
  teams: { teamId: string; name: string; resultPlace: number | null; resultValue: number | null; members: TeamPlayer[] }[];
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  state: TeamEventState;
  viewerId: string | null;
  isHost: boolean;
  isCompetitor: boolean;
  eventStatus: string;
  resultType: string;
  onChanged: () => void;
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
  onChanged,
}: Props) {
  const base = `/api/competitions/${competitionId}/events/${competitionEventId}`;
  const isLive = eventStatus === 'active' || eventStatus === 'results_pending';
  const players = state.teams.length > 0 ? state.teams.flatMap((team) => team.members) : state.pool;
  const [busy, setBusy] = useState<string | null>(null);
  const [ownRating, setOwnRating] = useState(() => players.find((p) => p.profileId === viewerId)?.strengthRating ?? 5);
  const [hostRatings, setHostRatings] = useState<Record<string, string>>({});
  const [teamCount, setTeamCount] = useState(2);
  const [teamValues, setTeamValues] = useState<Record<string, string>>({});
  const [teamDnf, setTeamDnf] = useState<Record<string, boolean>>({});
  const config = getResultInputConfig(resultType);

  async function call(key: string, path: string, method: string, body: unknown, success: string) {
    setBusy(key);
    const { error } = await apiCall(`${base}${path}`, { method, body: JSON.stringify(body) });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(success);
    onChanged();
  }

  if (state.pool.length === 0 && state.teams.length === 0) {
    return (
      <View className="bg-white rounded-lg border border-neutral-200 mx-4 p-4">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#2D6A4F" />
          <Text className="text-sm font-semibold text-neutral-700">Team assignment</Text>
        </View>
        <Text className="text-sm text-neutral-500 mt-2">
          {isLive
            ? isHost
              ? 'Gather the competitors into a player pool to rate and balance them into teams. Results can still be entered individually instead.'
              : 'Results for this event are being entered individually unless the host forms teams.'
            : 'When the host starts this event, players get a strength rating and are balanced into teams.'}
        </Text>
        {isHost && isLive && (
          <TouchableOpacity
            className="flex-row items-center gap-2 bg-primary rounded-lg px-4 py-2.5 mt-3 self-start"
            disabled={busy === 'pool'}
            onPress={() => void call('pool', '/teams', 'POST', { action: 'pool' }, 'Players gathered into the pool')}
          >
            <Users size={14} color="#fff" />
            <Text className="text-sm font-semibold text-white">{busy === 'pool' ? 'Gathering…' : 'Gather players for teams'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const unconfirmed = state.pool.filter((player) => !player.confirmed);
  const teamsLocked = state.teams.some((team) => team.resultValue !== null || team.resultPlace !== null);
  const sortedTeams = [...state.teams].sort(
    (a, b) => (a.resultPlace ?? 99) - (b.resultPlace ?? 99) || a.name.localeCompare(b.name),
  );
  const showTeamResults = isHost && isLive && state.teams.length >= 2;

  function submitTeamResults() {
    const results = state.teams.map((team) => ({
      team_id: team.teamId,
      is_dnf: !!teamDnf[team.teamId],
      value: teamDnf[team.teamId] ? null : parseResultInput(resultType, teamValues[team.teamId] ?? ''),
    }));
    if (results.some((entry) => !entry.is_dnf && entry.value === null)) {
      toast.error(`Enter a valid ${config.label.toLowerCase()} for every team, or mark it as DNF`);
      return;
    }
    void call('results', '/team-results', 'POST', { results }, 'Team results confirmed');
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4 p-4 gap-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Users size={16} color="#2D6A4F" />
          <Text className="text-sm font-semibold text-neutral-700">
            {state.teams.length > 0 ? 'Teams' : 'Strength ratings'}
          </Text>
        </View>
        <Text className="text-xs text-neutral-500">{players.length} players</Text>
      </View>

      {state.teams.length === 0 && (
        <View className="gap-3">
          <Text className="text-xs text-neutral-500">
            Each player has a strength rating from 1 to 10. Ratings from past results are accepted straight away;
            others are confirmed by a peer vote. The host then balances everyone into fair teams.
          </Text>
          {state.pool.map((player) => {
            const isSelf = player.profileId === viewerId;
            const canSetOwn = isSelf && isLive && !player.confirmed && player.votesCast === 0;
            const canVote = !isSelf && isCompetitor && isLive && !player.confirmed && !player.needsHost && !player.viewerVote;
            return (
              <View key={player.teamMemberId} className="border-t border-neutral-100 pt-3 gap-2">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-800" numberOfLines={1}>
                      {player.displayName}{isSelf ? ' (you)' : ''}
                    </Text>
                    <Text className="text-xs text-neutral-500">
                      Rating {player.strengthRating}/10
                      {player.confirmed
                        ? ` · confirmed (${RATING_SOURCE_LABELS[player.ratingSource]})`
                        : player.needsHost
                          ? ' · disputed twice: the host will decide'
                          : ` · awaiting votes${player.round === 2 ? ' (round 2)' : ''}`}
                    </Text>
                  </View>
                  {player.confirmed && <CheckCircle size={16} color="#16A34A" />}
                </View>

                {canSetOwn && (
                  <View className="flex-row items-center gap-3">
                    <Text className="text-xs text-neutral-600">Your rating</Text>
                    <TouchableOpacity onPress={() => setOwnRating((r) => Math.max(1, r - 1))} className="border border-neutral-200 rounded p-1" accessibilityLabel="Lower your rating">
                      <Minus size={14} color="#374151" />
                    </TouchableOpacity>
                    <Text className="text-sm font-semibold text-neutral-900 w-6 text-center">{ownRating}</Text>
                    <TouchableOpacity onPress={() => setOwnRating((r) => Math.min(10, r + 1))} className="border border-neutral-200 rounded p-1" accessibilityLabel="Raise your rating">
                      <Plus size={14} color="#374151" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="bg-primary rounded-md px-3 py-1.5"
                      disabled={busy === `own-${player.teamMemberId}`}
                      onPress={() => void call(`own-${player.teamMemberId}`, '/strength-rating', 'POST', { self_rating: ownRating }, 'Your rating was saved')}
                    >
                      <Text className="text-xs font-semibold text-white">Save</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {canVote && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      className="flex-row items-center gap-1 border border-green-300 rounded-md px-2.5 py-1.5"
                      disabled={busy === `vote-${player.teamMemberId}`}
                      onPress={() => void call(`vote-${player.teamMemberId}`, '/strength-vote', 'POST', { team_member_id: player.teamMemberId, vote: 'confirm' }, 'Vote recorded')}
                    >
                      <ThumbsUp size={12} color="#15803D" />
                      <Text className="text-xs font-semibold text-green-700">Confirm rating</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      className="flex-row items-center gap-1 border border-red-200 rounded-md px-2.5 py-1.5"
                      disabled={busy === `vote-${player.teamMemberId}`}
                      onPress={() => void call(`vote-${player.teamMemberId}`, '/strength-vote', 'POST', { team_member_id: player.teamMemberId, vote: 'reject' }, 'Vote recorded')}
                    >
                      <ThumbsDown size={12} color="#DC2626" />
                      <Text className="text-xs font-semibold text-red-600">Too high/low</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {!isSelf && player.viewerVote && !player.confirmed && (
                  <Text className="text-xs text-neutral-400">
                    You voted {player.viewerVote === 'confirm' ? 'to confirm' : 'against'}
                  </Text>
                )}

                {isHost && isLive && (
                  <View className="flex-row items-center gap-2">
                    <Text className="text-xs text-neutral-500">Set rating</Text>
                    <TextInput
                      className="border border-neutral-300 rounded-md px-2 py-1 w-16 text-sm"
                      keyboardType="decimal-pad"
                      placeholder={String(player.strengthRating)}
                      value={hostRatings[player.teamMemberId] ?? ''}
                      onChangeText={(text) => setHostRatings((current) => ({ ...current, [player.teamMemberId]: text }))}
                      accessibilityLabel={`Set rating for ${player.displayName}`}
                    />
                    <TouchableOpacity
                      className={`border border-neutral-200 rounded-md px-2.5 py-1 ${!hostRatings[player.teamMemberId] ? 'opacity-40' : ''}`}
                      disabled={!hostRatings[player.teamMemberId] || busy === `host-${player.teamMemberId}`}
                      onPress={() => void call(
                        `host-${player.teamMemberId}`,
                        '/strength-rating',
                        'PATCH',
                        { team_member_id: player.teamMemberId, rating: Number(hostRatings[player.teamMemberId]) },
                        `${player.displayName}'s rating was set`,
                      )}
                    >
                      <Text className="text-xs font-semibold text-neutral-700">Set</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}

          {isHost && isLive && state.pool.length >= 2 && (
            <View className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 gap-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-semibold text-neutral-700">Number of teams</Text>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity onPress={() => setTeamCount((n) => Math.max(2, n - 1))} className="border border-neutral-200 rounded p-1 bg-white" accessibilityLabel="Fewer teams">
                    <Minus size={14} color="#374151" />
                  </TouchableOpacity>
                  <Text className="text-sm font-semibold text-neutral-900">{teamCount}</Text>
                  <TouchableOpacity onPress={() => setTeamCount((n) => Math.min(state.pool.length, n + 1))} className="border border-neutral-200 rounded p-1 bg-white" accessibilityLabel="More teams">
                    <Plus size={14} color="#374151" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text className="text-xs text-neutral-500">
                About {Math.ceil(state.pool.length / teamCount)} players per team.
                {unconfirmed.length > 0 ? ` ${unconfirmed.length} rating${unconfirmed.length === 1 ? ' is' : 's are'} not confirmed yet and will be used as they are.` : ''}
              </Text>
              <TouchableOpacity
                disabled={busy === 'pool'}
                onPress={() => void call('pool', '/teams', 'POST', { action: 'pool' }, 'Player pool updated')}
              >
                <Text className="text-xs font-semibold text-primary">Add competitors who joined late</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center justify-center gap-2 bg-primary rounded-lg py-2.5"
                disabled={busy === 'assign'}
                onPress={() => void call('assign', '/teams', 'POST', { team_count: teamCount }, 'Teams assigned')}
              >
                {busy === 'assign' ? <ActivityIndicator color="#fff" size="small" /> : <Shuffle size={14} color="#fff" />}
                <Text className="text-sm font-semibold text-white">Balance teams</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {state.teams.length > 0 && (
        <View className="gap-3">
          {sortedTeams.map((team) => {
            const total = team.members.reduce((sum, member) => sum + member.strengthRating, 0);
            return (
              <View key={team.teamId} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-sm font-bold text-neutral-800">
                    {team.resultPlace != null ? `${formatPlace(team.resultPlace)} · ` : ''}{team.name}
                  </Text>
                  <Text className="text-xs text-neutral-500">
                    {team.resultValue != null ? formatResultValue(team.resultValue, resultType) : `strength ${total.toFixed(1)}`}
                  </Text>
                </View>
                {team.members.map((member) => (
                  <View key={member.teamMemberId} className="flex-row justify-between">
                    <Text className="text-xs text-neutral-700" numberOfLines={1}>
                      {member.displayName}{member.profileId === viewerId ? ' (you)' : ''}
                    </Text>
                    <Text className="text-xs font-semibold text-neutral-500">{member.strengthRating}</Text>
                  </View>
                ))}
              </View>
            );
          })}

          {showTeamResults && (
            <View className="rounded-lg border border-neutral-100 bg-neutral-50 p-3 gap-3">
              <Text className="text-sm font-semibold text-neutral-800">Record team results</Text>
              <Text className="text-xs text-neutral-500">
                Enter each team&apos;s {config.label.toLowerCase()}. Every player shares their team&apos;s place and points.
              </Text>
              {state.teams.map((team) => (
                <View key={team.teamId} className="flex-row items-center gap-2">
                  <Text className="w-20 text-sm font-semibold text-neutral-800" numberOfLines={1}>{team.name}</Text>
                  <TextInput
                    className={`flex-1 border border-neutral-300 rounded-md px-2 py-1.5 text-sm bg-white ${teamDnf[team.teamId] ? 'opacity-40' : ''}`}
                    editable={!teamDnf[team.teamId]}
                    keyboardType={config.inputMode === 'text' ? 'numbers-and-punctuation' : 'decimal-pad'}
                    placeholder={config.placeholder}
                    value={teamValues[team.teamId] ?? ''}
                    onChangeText={(text) => setTeamValues((current) => ({ ...current, [team.teamId]: text }))}
                    accessibilityLabel={`${config.label} for ${team.name}`}
                  />
                  <Text className="text-xs text-neutral-500">DNF</Text>
                  <Switch
                    value={!!teamDnf[team.teamId]}
                    onValueChange={(value) => setTeamDnf((current) => ({ ...current, [team.teamId]: value }))}
                    trackColor={{ true: '#EF4444' }}
                  />
                </View>
              ))}
              <View className="flex-row justify-between gap-2">
                {!teamsLocked ? (
                  <TouchableOpacity
                    className="flex-row items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-2 bg-white"
                    disabled={busy === 'assign'}
                    onPress={() => void call('assign', '/teams', 'POST', { team_count: state.teams.length }, 'Teams re-balanced')}
                  >
                    <Shuffle size={12} color="#4B5563" />
                    <Text className="text-xs font-semibold text-neutral-600">Re-balance</Text>
                  </TouchableOpacity>
                ) : <View />}
                <TouchableOpacity
                  className="bg-primary rounded-lg px-4 py-2"
                  disabled={busy === 'results'}
                  onPress={submitTeamResults}
                >
                  <Text className="text-sm font-semibold text-white">{busy === 'results' ? 'Saving…' : 'Confirm team results'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
