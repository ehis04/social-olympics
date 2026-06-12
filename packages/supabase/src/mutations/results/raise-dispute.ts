// Raises a dispute against a result and sets the event status to disputed.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

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

    // Get the competition_event_id from the disputed result
    const dispute = data as { result_id: string } | null;
    if (dispute?.result_id) {
      const { data: result } = await client
        .from('results')
        .select('competition_event_id')
        .eq('id', dispute.result_id)
        .single();

      const r = result as { competition_event_id: string } | null;
      if (r?.competition_event_id) {
        await client
          .from('competition_events')
          .update({ status: 'disputed' })
          .eq('id', r.competition_event_id);
      }
    }

    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
