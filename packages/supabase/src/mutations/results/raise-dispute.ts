/*
 * This file defines the raise dispute module.
 */

// Raises a dispute against a result and sets the event status to disputed.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

// Handles raise dispute.
export async function raiseDispute(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('result_disputes')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    // Get the competition_event_id from the disputed result.
    const resultId = payload.result_id;
    if (typeof resultId === 'string') {
      const { data: result, error: resultError } = await client
        .from('results')
        .select('competition_event_id')
        .eq('id', resultId)
        .single();

      if (resultError) {
        return { data: null, error: { code: resultError.code, message: resultError.message } };
      }

      const r = result as { competition_event_id: string } | null;
      if (r?.competition_event_id) {
        const { error: updateError } = await client
          .from('competition_events')
          .update({ status: 'disputed' })
          .eq('id', r.competition_event_id);

        if (updateError) {
          return { data: null, error: { code: updateError.code, message: updateError.message } };
        }
      }
    }

    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
