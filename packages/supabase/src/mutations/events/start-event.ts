// Sets a competition event to active (trigger locks voting and sets competition active).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function startEvent(
  client: SupabaseClient,
  competitionEventId: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('competition_events')
      .update({ status: 'active', started_at: new Date().toISOString() })
      .eq('id', competitionEventId)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
