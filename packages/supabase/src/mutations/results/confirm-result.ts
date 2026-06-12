// Confirms a result (triggers score recalculation, personal best update, feed insert).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export interface ConfirmResultPayload {
  result_id: string;
  finishing_place: number | null;
  points_awarded: number;
  participation_points: number;
}

export async function confirmResult(
  client: SupabaseClient,
  payload: ConfirmResultPayload,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('results')
      .update({
        confirmed_at: new Date().toISOString(),
        finishing_place: payload.finishing_place,
        points_awarded: payload.points_awarded,
        participation_points: payload.participation_points,
      })
      .eq('id', payload.result_id)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    // Set dispute window on the competition event — 24 hours from now
    const result = data as { competition_event_id: string } | null;
    if (result?.competition_event_id) {
      const windowCloses = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await client
        .from('competition_events')
        .update({ dispute_window_closes_at: windowCloses })
        .eq('id', result.competition_event_id);
    }

    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
