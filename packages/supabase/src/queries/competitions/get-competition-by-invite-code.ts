// Fetches a competition by its invite code (case-insensitive).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getCompetitionByInviteCode(
  client: SupabaseClient,
  code: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('competitions')
      .select('id, name, description, status, country_code, city, is_public, created_at, total_events, host_id')
      .eq('invite_code', code.toUpperCase())
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
