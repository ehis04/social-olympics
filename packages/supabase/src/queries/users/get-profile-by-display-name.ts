// Fetches a profile by display name (case-insensitive).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getProfileByDisplayName(
  client: SupabaseClient,
  displayName: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .ilike('display_name', displayName)
      .limit(1)
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
