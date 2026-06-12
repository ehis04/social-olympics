// Fetches all results for a member within a specific competition.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getResultsForMember(
  client: SupabaseClient,
  profileId: string,
  competitionId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('results')
      .select('*, competition_events!inner(competition_id, sequence_order, events(name, slug))')
      .eq('profile_id', profileId)
      .eq('competition_events.competition_id', competitionId);

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
