// Removes a competition event (trigger auto-decrements total_events and recalculates scores).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function removeCompetitionEvent(
  client: SupabaseClient,
  id: string,
): Promise<ApiResponse<void>> {
  try {
    const { error } = await client.from('competition_events').delete().eq('id', id);
    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
