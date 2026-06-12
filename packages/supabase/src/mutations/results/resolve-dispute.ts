// Resolves or dismisses a dispute, always moving the event back to confirmed.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function resolveDispute(
  client: SupabaseClient,
  disputeId: string,
  action: 'resolve' | 'dismiss',
): Promise<ApiResponse<unknown>> {
  try {
    const newStatus = action === 'resolve' ? 'resolved' : 'dismissed';

    const { data, error } = await client
      .from('result_disputes')
      .update({ status: newStatus, resolved_at: new Date().toISOString() })
      .eq('id', disputeId)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    // Move competition event back to confirmed regardless of action
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
          .update({ status: 'confirmed' })
          .eq('id', r.competition_event_id);
      }
    }

    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
