// Sends a group chat or direct message.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function sendMessage(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('messages')
      .insert(payload)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
