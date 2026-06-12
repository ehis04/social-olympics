// Removes a reaction (RLS enforces profile_id = auth.uid()).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function removeReaction(
  client: SupabaseClient,
  reactionId: string,
): Promise<ApiResponse<void>> {
  try {
    const { error } = await client.from('reactions').delete().eq('id', reactionId);
    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
