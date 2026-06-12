// Creates a ghost profile and adds it as a competitor in a competition (admin only).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function createGhostProfile(
  adminClient: SupabaseClient,
  displayName: string,
  competitionId: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .insert({ display_name: displayName, is_ghost: true, claimed_by: null })
      .select()
      .single();

    if (profileError) return { data: null, error: { code: profileError.code, message: profileError.message } };

    const ghostProfile = profile as { id: string };

    const { data: member, error: memberError } = await adminClient
      .from('competition_members')
      .insert({ competition_id: competitionId, profile_id: ghostProfile.id, role: 'competitor' })
      .select()
      .single();

    if (memberError) return { data: null, error: { code: memberError.code, message: memberError.message } };

    return { data: { profile, member }, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
