// Fetches all competitions a user is a member of (active and archived).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getUserCompetitions(
  client: SupabaseClient,
  profileId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('competition_members')
      .select('competitions(id, name, description, status, country_code, city, is_public, created_at, total_events, host_id)')
      .eq('profile_id', profileId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    const competitions = (data ?? []).map((m: unknown) => (m as { competitions: unknown }).competitions).filter(Boolean);
    return { data: competitions, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
