/*
 * This file defines the get team leaderboard module.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';
import { POINTS_SCALE } from '@repo/constants';

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  members: string[];
  events_played: number;
  events_won: number;
  total_points: number;
  rank: number;
}

const POOL_TEAM_NAME = 'Player pool';

type RawTeam = {
  id: string;
  name: string;
  result_place: number | null;
  competition_event_id: string;
  created_at: string;
  team_members: Array<{ profile_id: string; profiles: { display_name: string } | { display_name: string }[] | null }>;
};

// Uses the competition's own points table when it has one, otherwise the platform defaults.
async function loadPointsTable(client: SupabaseClient, competitionId: string): Promise<Map<number, number>> {
  const { data: custom } = await client
    .from('event_points_config')
    .select('finishing_place, points_value')
    .eq('competition_id', competitionId);
  const rows = custom && custom.length > 0
    ? custom
    : (await client.from('event_points_config').select('finishing_place, points_value').is('competition_id', null)).data ?? [];
  const table = new Map<number, number>();
  for (const row of rows) table.set(Number(row.finishing_place), Number(row.points_value));
  if (table.size === 0) for (const [place, points] of Object.entries(POINTS_SCALE)) table.set(Number(place), points);
  return table;
}

// Combines confirmed team results into standings. Teams with the same players across
// several events are treated as one team; points follow the competition's scoring and weights.
export async function getTeamLeaderboard(
  client: SupabaseClient,
  competitionId: string,
): Promise<ApiResponse<TeamLeaderboardEntry[]>> {
  try {
    const { data: events, error: eventsError } = await client
      .from('competition_events')
      .select('id, weight_multiplier')
      .eq('competition_id', competitionId)
      .eq('status', 'confirmed');

    if (eventsError) {
      return { data: null, error: { code: eventsError.code, message: eventsError.message } };
    }

    const eventIds = (events ?? []).map((e) => e.id);
    if (eventIds.length === 0) return { data: [], error: null };

    const { data: teams, error: teamsError } = await client
      .from('teams')
      .select('id, name, result_place, competition_event_id, created_at, team_members(profile_id, profiles(display_name))')
      .in('competition_event_id', eventIds)
      .neq('name', POOL_TEAM_NAME)
      .not('result_place', 'is', null);

    if (teamsError) {
      return { data: null, error: { code: teamsError.code, message: teamsError.message } };
    }

    const pointsTable = await loadPointsTable(client, competitionId);
    const weightMap = new Map((events ?? []).map((e) => [e.id, Number(e.weight_multiplier ?? 1)]));

    const groups = new Map<string, TeamLeaderboardEntry & { latest: string }>();
    for (const team of (teams ?? []) as unknown as RawTeam[]) {
      if (team.team_members.length === 0) continue;
      const rosterKey = team.team_members.map((member) => member.profile_id).sort().join('|');
      const place = team.result_place ?? 0;
      const points = (pointsTable.get(place) ?? 0) * (weightMap.get(team.competition_event_id) ?? 1);
      const memberNames = team.team_members
        .map((member) => {
          const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
          return profile?.display_name ?? null;
        })
        .filter((name): name is string => name !== null);

      const existing = groups.get(rosterKey);
      if (existing) {
        existing.events_played += 1;
        existing.events_won += place === 1 ? 1 : 0;
        existing.total_points += points;
        if (team.created_at > existing.latest) {
          existing.latest = team.created_at;
          existing.team_name = team.name;
          existing.team_id = team.id;
        }
      } else {
        groups.set(rosterKey, {
          team_id: team.id,
          team_name: team.name,
          members: memberNames,
          events_played: 1,
          events_won: place === 1 ? 1 : 0,
          total_points: points,
          rank: 0,
          latest: team.created_at,
        });
      }
    }

    const entries: TeamLeaderboardEntry[] = [...groups.values()].map(({ latest: _latest, ...entry }) => ({
      ...entry,
      total_points: Math.round(entry.total_points * 100) / 100,
    }));
    entries.sort((a, b) => b.total_points - a.total_points || b.events_won - a.events_won);

    let rank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i]!.total_points !== entries[i - 1]!.total_points) rank = i + 1;
      entries[i]!.rank = rank;
    }

    return { data: entries, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
