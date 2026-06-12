// Creates a custom event in the library (is_custom = true).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function createCustomEvent(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('events')
      .insert({ ...payload, is_custom: true })
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
