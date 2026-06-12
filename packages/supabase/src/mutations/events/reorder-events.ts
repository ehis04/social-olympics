// Bulk updates sequence_order for a list of competition event IDs.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function reorderEvents(
  client: SupabaseClient,
  orderedIds: string[],
): Promise<ApiResponse<void>> {
  try {
    await Promise.all(
      orderedIds.map((id, index) =>
        client
          .from('competition_events')
          .update({ sequence_order: index + 1 })
          .eq('id', id),
      ),
    );
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
