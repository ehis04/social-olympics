/*
 * This file manages the player pool, strength ratings and teams for team events.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { balanceTeamsByCount, getHistoricalRating } from '@repo/scoring';
import type { HistoricalResult } from '@repo/scoring';

// Players wait in this team until the host balances them into real teams.
export const POOL_TEAM_NAME = 'Player pool';
const DEFAULT_RATING = 5;

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

export interface AssignedTeam {
  teamId: string;
  name: string;
  resultPlace: number | null;
  resultValue: number | null;
  members: TeamPlayer[];
}

export interface TeamEventState {
  pool: TeamPlayer[];
  teams: AssignedTeam[];
  eligibleVoters: number;
}

interface TeamMemberRow {
  id: string;
  profile_id: string;
  strength_rating: number;
  rating_source: TeamPlayer['ratingSource'];
  confirmed_at: string | null;
  team_id: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
}

interface VoteRow {
  team_member_id: string;
  voter_profile_id: string;
  vote: 'confirm' | 'reject';
  submission_round: number;
}

// Creates the player pool when a team event starts, using each player's history where available.
// Called again before teams are assigned, it adds competitors who are not in the pool yet.
export async function ensurePlayerPool(
  adminClient: SupabaseClient,
  competitionId: string,
  competitionEventId: string,
): Promise<{ error: string | null; added: number }> {
  const { data: teamRows } = await adminClient
    .from('teams')
    .select('id, name')
    .eq('competition_event_id', competitionEventId);
  const teams = teamRows ?? [];
  // Once players are balanced into teams, the pool is closed.
  if (teams.some((team) => team.name !== POOL_TEAM_NAME)) return { error: null, added: 0 };
  const existingPool = teams.find((team) => team.name === POOL_TEAM_NAME) ?? null;

  const [{ data: eventRow }, { data: assigned }, { data: competitors }, { data: pooled }] = await Promise.all([
    adminClient.from('competition_events').select('events(slug)').eq('id', competitionEventId).single(),
    adminClient.from('competition_event_participants').select('profile_id').eq('competition_event_id', competitionEventId),
    adminClient
      .from('competition_members')
      .select('profile_id')
      .eq('competition_id', competitionId)
      .eq('status', 'active')
      .eq('role', 'competitor'),
    existingPool
      ? adminClient.from('team_members').select('profile_id').eq('team_id', existingPool.id)
      : Promise.resolve({ data: [] as { profile_id: string }[] }),
  ]);

  const competitorIds = new Set((competitors ?? []).map((row) => row.profile_id as string));
  const assignedIds = (assigned ?? []).map((row) => row.profile_id as string).filter((id) => competitorIds.has(id));
  const alreadyPooled = new Set((pooled ?? []).map((row) => row.profile_id as string));
  const playerIds = (assignedIds.length >= 2 ? assignedIds : [...competitorIds]).filter((id) => !alreadyPooled.has(id));
  if (playerIds.length === 0) return { error: null, added: 0 };

  const eventSlug = (eventRow?.events as unknown as { slug: string } | null)?.slug ?? '';
  const comparisonIds = [...new Set([...playerIds, ...alreadyPooled])];
  const { data: history } = await adminClient
    .from('results')
    .select('profile_id, result_value_primary, competition_events!inner(events!inner(slug, result_type))')
    .in('profile_id', comparisonIds)
    .neq('competition_event_id', competitionEventId)
    .not('confirmed_at', 'is', null)
    .not('result_value_primary', 'is', null);

  const historical: HistoricalResult[] = (history ?? []).map((row) => {
    const library = (row.competition_events as unknown as { events: { slug: string; result_type: string } }).events;
    return {
      profileId: row.profile_id as string,
      eventSlug: library.slug,
      resultValuePrimary: Number(row.result_value_primary),
      resultType: library.result_type,
    };
  });

  let poolId = existingPool?.id as string | undefined;
  if (!poolId) {
    const { data: pool, error: poolError } = await adminClient
      .from('teams')
      .insert({ competition_event_id: competitionEventId, name: POOL_TEAM_NAME })
      .select('id')
      .single();
    if (poolError || !pool) return { error: 'Failed to create the player pool', added: 0 };
    poolId = pool.id as string;
  }

  const now = new Date().toISOString();
  const { error } = await adminClient.from('team_members').insert(
    playerIds.map((profileId) => {
      const rating = eventSlug ? getHistoricalRating(profileId, eventSlug, historical) : null;
      return {
        team_id: poolId,
        profile_id: profileId,
        strength_rating: rating ?? DEFAULT_RATING,
        // Ratings backed by history are accepted straight away; others go to a peer vote.
        rating_source: 'historical',
        confirmed_at: rating !== null ? now : null,
      };
    }),
  );
  if (error) return { error: 'Failed to add players to the pool', added: 0 };
  return { error: null, added: playerIds.length };
}

// Loads the pool, teams, ratings and the viewer's votes for a team event.
export async function getTeamEventState(
  adminClient: SupabaseClient,
  competitionId: string,
  competitionEventId: string,
  viewerId: string | null,
): Promise<TeamEventState> {
  const { data: teamRows } = await adminClient
    .from('teams')
    .select('id, name, result_place')
    .eq('competition_event_id', competitionEventId)
    .order('name');
  const teams = teamRows ?? [];
  if (teams.length === 0) return { pool: [], teams: [], eligibleVoters: 0 };

  const teamIds = teams.map((team) => team.id as string);
  const [{ data: memberRows }, { count: competitorCount }, { data: teamResults }] = await Promise.all([
    adminClient
      .from('team_members')
      .select('id, profile_id, strength_rating, rating_source, confirmed_at, team_id, profiles(display_name, avatar_url)')
      .in('team_id', teamIds),
    adminClient
      .from('competition_members')
      .select('id', { count: 'exact', head: true })
      .eq('competition_id', competitionId)
      .eq('status', 'active')
      .eq('role', 'competitor'),
    adminClient
      .from('results')
      .select('team_id, result_value_primary')
      .eq('competition_event_id', competitionEventId)
      .not('team_id', 'is', null),
  ]);

  const members = (memberRows ?? []) as unknown as TeamMemberRow[];
  const { data: voteRows } = members.length > 0
    ? await adminClient
      .from('strength_rating_votes')
      .select('team_member_id, voter_profile_id, vote, submission_round')
      .in('team_member_id', members.map((member) => member.id))
    : { data: [] as VoteRow[] };
  const votes = (voteRows ?? []) as VoteRow[];

  // Everyone except the rated player can vote on a rating.
  const eligibleVoters = Math.max(0, (competitorCount ?? 0) - 1);
  const majority = Math.floor(eligibleVoters / 2) + 1;

  const toPlayer = (member: TeamMemberRow): TeamPlayer => {
    const own = votes.filter((vote) => vote.team_member_id === member.id);
    const roundOneRejects = own.filter((vote) => vote.submission_round === 1 && vote.vote === 'reject').length;
    const roundTwoRejects = own.filter((vote) => vote.submission_round === 2 && vote.vote === 'reject').length;
    const round: 1 | 2 = eligibleVoters > 0 && roundOneRejects >= majority ? 2 : 1;
    const needsHost = round === 2 && roundTwoRejects >= majority;
    const viewerVote = own.find((vote) => vote.voter_profile_id === viewerId && vote.submission_round === round)?.vote ?? null;
    return {
      teamMemberId: member.id,
      profileId: member.profile_id,
      displayName: member.profiles?.display_name ?? 'Unknown',
      avatarUrl: member.profiles?.avatar_url ?? null,
      strengthRating: Number(member.strength_rating),
      ratingSource: member.rating_source,
      confirmed: member.confirmed_at !== null,
      round,
      needsHost: !member.confirmed_at && needsHost,
      viewerVote,
      votesCast: own.filter((vote) => vote.submission_round === round).length,
    };
  };

  const valueByTeam = new Map<string, number>();
  for (const row of teamResults ?? []) {
    if (row.team_id && row.result_value_primary !== null && !valueByTeam.has(row.team_id)) {
      valueByTeam.set(row.team_id as string, Number(row.result_value_primary));
    }
  }

  const poolTeam = teams.find((team) => team.name === POOL_TEAM_NAME);
  const pool = poolTeam ? members.filter((member) => member.team_id === poolTeam.id).map(toPlayer) : [];
  const assignedTeams = teams
    .filter((team) => team.name !== POOL_TEAM_NAME)
    .map((team) => ({
      teamId: team.id as string,
      name: team.name as string,
      resultPlace: (team.result_place as number | null) ?? null,
      resultValue: valueByTeam.get(team.id as string) ?? null,
      members: members.filter((member) => member.team_id === team.id).map(toPlayer),
    }));

  return { pool, teams: assignedTeams, eligibleVoters };
}

// Balances every player in the event into the requested number of teams, replacing any earlier split.
export async function assignBalancedTeams(
  adminClient: SupabaseClient,
  competitionEventId: string,
  teamCount: number,
): Promise<{ error: string | null; withinTolerance?: boolean }> {
  const { data: teamRows } = await adminClient
    .from('teams')
    .select('id, name')
    .eq('competition_event_id', competitionEventId);
  const oldTeams = teamRows ?? [];
  if (oldTeams.length === 0) return { error: 'Start the event to create the player pool first' };

  const { count: resultCount } = await adminClient
    .from('results')
    .select('id', { count: 'exact', head: true })
    .eq('competition_event_id', competitionEventId)
    .not('team_id', 'is', null);
  if ((resultCount ?? 0) > 0) return { error: 'Teams cannot be changed once team results have been entered' };

  const { data: memberRows } = await adminClient
    .from('team_members')
    .select('id, profile_id, strength_rating')
    .in('team_id', oldTeams.map((team) => team.id));
  const members = memberRows ?? [];
  if (members.length < 2) return { error: 'At least two players are needed to make teams' };
  if (teamCount < 2 || teamCount > members.length) {
    return { error: `Choose between 2 and ${members.length} teams` };
  }

  const balanced = balanceTeamsByCount(
    members.map((member) => ({ profileId: member.profile_id as string, strengthRating: Number(member.strength_rating) })),
    teamCount,
  );

  for (const [index, team] of balanced.teams.entries()) {
    const { data: created, error } = await adminClient
      .from('teams')
      .insert({
        competition_event_id: competitionEventId,
        name: `Team ${String.fromCharCode(65 + index)}`,
        total_strength: team.players.reduce((sum, player) => sum + player.strengthRating, 0),
      })
      .select('id')
      .single();
    if (error || !created) return { error: 'Failed to create teams' };

    const memberIds = team.players
      .map((player) => members.find((member) => member.profile_id === player.profileId)?.id)
      .filter((id): id is string => !!id);
    const { error: moveError } = await adminClient.from('team_members').update({ team_id: created.id }).in('id', memberIds);
    if (moveError) return { error: 'Failed to move players into teams' };
  }

  // The old pool and teams are empty now that every player has moved.
  await adminClient.from('teams').delete().in('id', oldTeams.map((team) => team.id));
  return { error: null, withinTolerance: balanced.withinTolerance };
}
