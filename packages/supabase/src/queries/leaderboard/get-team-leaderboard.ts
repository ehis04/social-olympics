import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export interface TeamLeaderboardEntry {
  team_id: string;
  team_name: string;
  members: string[];
  events_won: number;
  total_points: number;
  rank: number;
}

export async function getTeamLeaderboard(
  client: SupabaseClient,
  competitionId: string,
): Promise<ApiResponse<TeamLeaderboardEntry[]>> {
  try {
    // Find confirmed team events for this competition
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
      .select(
        'id, name, result_place, competition_event_id, team_members(profiles(display_name))',
      )
      .in('competition_event_id', eventIds);

    if (teamsError) {
      return { data: null, error: { code: teamsError.code, message: teamsError.message } };
    }

    type RawTeam = {
      id: string;
      name: string;
      result_place: number | null;
      competition_event_id: string;
      team_members: Array<{ profiles: { display_name: string } | { display_name: string }[] | null }>;
    };

    const rows = (teams ?? []) as unknown as RawTeam[];
    const weightMap = new Map(
      (events ?? []).map((e) => [e.id, e.weight_multiplier ?? 1]),
    );

    // Simple points scale: 1st=10, 2nd=7, 3rd=5, 4th=3, 5th+=1
    function placeToPoints(place: number | null, multiplier: number): number {
      if (place === null) return 0;
      const base = [10, 7, 5, 3, 1][place - 1] ?? 1;
      return base * multiplier;
    }

    const entries: TeamLeaderboardEntry[] = rows.map((team) => {
      const multiplier = weightMap.get(team.competition_event_id) ?? 1;
      const points = placeToPoints(team.result_place, multiplier);
      const members = team.team_members
        .map((tm) => {
          const p = tm.profiles;
          if (!p) return null;
          if (Array.isArray(p)) return (p[0] as { display_name: string } | undefined)?.display_name ?? null;
          return (p as { display_name: string }).display_name;
        })
        .filter((n): n is string => n !== null);

      return {
        team_id: team.id,
        team_name: team.name,
        members,
        events_won: team.result_place === 1 ? 1 : 0,
        total_points: points,
        rank: 0,
      };
    });

    // Sort by points desc, then events_won desc
    entries.sort((a, b) => b.total_points - a.total_points || b.events_won - a.events_won);

    // Assign ranks with tie detection
    let rank = 1;
    for (let i = 0; i < entries.length; i++) {
      if (i > 0 && entries[i]!.total_points !== entries[i - 1]!.total_points) {
        rank = i + 1;
      }
      entries[i]!.rank = rank;
    }

    return { data: entries, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
