// Fetches all events for a competition ordered by sequence.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getCompetitionEvents(
  client: SupabaseClient,
  competitionId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('competition_events')
      .select('*, events(*, event_categories(name, slug))')
      .eq('competition_id', competitionId)
      .order('sequence_order', { ascending: true });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
