// Fetches a single competition event by ID.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getCompetitionEvent(
  client: SupabaseClient,
  id: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('competition_events')
      .select('*, events(*, event_categories(name, slug))')
      .eq('id', id)
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
