// Claims a ghost profile for an authenticated user (admin client bypasses RLS).
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function claimGhostProfile(
  adminClient: SupabaseClient,
  ghostProfileId: string,
  claimingUserId: string,
): Promise<ApiResponse<unknown>> {
  try {
    // Verify the profile is actually a ghost before claiming
    const { data: existing, error: fetchError } = await adminClient
      .from('profiles')
      .select('id, is_ghost')
      .eq('id', ghostProfileId)
      .single();

    if (fetchError) return { data: null, error: { code: fetchError.code, message: fetchError.message } };

    const profile = existing as { id: string; is_ghost: boolean } | null;
    if (!profile?.is_ghost) {
      return { data: null, error: { code: 'NOT_GHOST', message: 'Profile is not a ghost profile' } };
    }

    const { data, error } = await adminClient
      .from('profiles')
      .update({ claimed_by: claimingUserId, claimed_at: new Date().toISOString(), is_ghost: false })
      .eq('id', ghostProfileId)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
