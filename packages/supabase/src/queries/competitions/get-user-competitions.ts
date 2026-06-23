// Fetches all competitions a user is a member of (active and archived).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getUserCompetitions(
  client: SupabaseClient,
  profileId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    // Collect competition IDs from two sources: active/invited memberships + hosted competitions
    const [membershipResult, hostedResult] = await Promise.all([
      client
        .from('competition_members')
        .select('competition_id')
        .eq('profile_id', profileId)
        .in('status', ['active', 'invited']),
      client
        .from('competitions')
        .select('id')
        .eq('host_id', profileId),
    ]);

    if (membershipResult.error) {
      return { data: null, error: { code: membershipResult.error.code, message: membershipResult.error.message } };
    }

    const memberIds = (membershipResult.data ?? []).map((m: { competition_id: string }) => m.competition_id);
    const hostedIds = hostedResult.error ? [] : (hostedResult.data ?? []).map((c: { id: string }) => c.id);
    const competitionIds = [...new Set([...memberIds, ...hostedIds])];

    if (competitionIds.length === 0) return { data: [], error: null };

    const { data, error } = await client
      .from('competitions')
      .select('id, name, description, status, country_code, city, is_public, created_at, total_events, host_id')
      .in('id', competitionIds)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
