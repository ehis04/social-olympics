// Fetches a single profile with career stats.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getProfile(
  client: SupabaseClient,
  profileId: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('*, career_stats(*)')
      .eq('id', profileId)
      .maybeSingle();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
