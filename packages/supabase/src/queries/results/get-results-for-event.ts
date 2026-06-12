// Fetches all results for a competition event ordered by finishing place.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getResultsForEvent(
  client: SupabaseClient,
  competitionEventId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('results')
      .select('*, profiles!results_profile_id_fkey(id, display_name, avatar_url, country_code), teams(id, name)')
      .eq('competition_event_id', competitionEventId)
      .order('finishing_place', { ascending: true, nullsFirst: false })
      .order('submitted_at', { ascending: true });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
