// Adds a profile as a competition member (spectator if competition is active).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function addMember(
  client: SupabaseClient,
  competitionId: string,
  profileId: string,
  role: string,
): Promise<ApiResponse<unknown>> {
  try {
    // If competition is active (voting_locked = true), override role to spectator
    const { data: competition, error: compError } = await client
      .from('competitions')
      .select('voting_locked')
      .eq('id', competitionId)
      .single();

    if (compError) return { data: null, error: { code: compError.code, message: compError.message } };

    const effectiveRole = (competition as { voting_locked: boolean } | null)?.voting_locked
      ? 'spectator'
      : role;

    const { data, error } = await client
      .from('competition_members')
      .insert({ competition_id: competitionId, profile_id: profileId, role: effectiveRole })
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
