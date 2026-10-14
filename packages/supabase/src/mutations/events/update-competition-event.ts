/*
 * This file defines the update competition event module.
 */

// Updates a competition event (weight change triggers score recalculation automatically).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

// Handles update competition event.
export async function updateCompetitionEvent(
  client: SupabaseClient,
  id: string,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('competition_events')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
