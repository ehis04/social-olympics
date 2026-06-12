// Fetches team leaderboard data aggregated from confirmed team events.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getTeamLeaderboard(
  client: SupabaseClient,
  competitionId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('teams')
      .select('id, name, competition_id, total_points, win_count, loss_count, draw_count')
      .eq('competition_id', competitionId)
      .order('total_points', { ascending: false })
      .order('win_count', { ascending: false });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
