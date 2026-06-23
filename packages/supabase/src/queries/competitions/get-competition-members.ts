// Fetches all members of a competition with profile summaries.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getCompetitionMembers(
  client: SupabaseClient,
  competitionId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('competition_members')
      .select('*, profile:profiles(id, display_name, avatar_url, country_code, is_ghost)')
      .eq('competition_id', competitionId)
      .order('total_points', { ascending: false })
      .order('gold_count', { ascending: false });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
