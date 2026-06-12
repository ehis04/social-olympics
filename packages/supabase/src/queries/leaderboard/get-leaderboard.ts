// Fetches raw leaderboard data (rankEntries from @repo/scoring adds ranks on top).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getLeaderboard(
  client: SupabaseClient,
  competitionId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('competition_members')
      .select('*, profiles(id, display_name, avatar_url, country_code)')
      .eq('competition_id', competitionId)
      .order('total_points', { ascending: false })
      .order('gold_count', { ascending: false })
      .order('silver_count', { ascending: false })
      .order('bronze_count', { ascending: false });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
