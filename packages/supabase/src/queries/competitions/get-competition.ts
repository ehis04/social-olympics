// Fetches a competition with host and cohost profile summaries.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getCompetition(
  client: SupabaseClient,
  id: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('competitions')
      .select(`
        *,
        host:profiles!competitions_host_id_fkey(id, display_name, avatar_url, country_code),
        cohost:profiles!competitions_cohost_id_fkey(id, display_name, avatar_url, country_code)
      `)
      .eq('id', id)
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
