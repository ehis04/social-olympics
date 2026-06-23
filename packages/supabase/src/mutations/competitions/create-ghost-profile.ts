import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function createGhostProfile(
  adminClient: SupabaseClient,
  displayName: string,
  competitionId: string,
): Promise<ApiResponse<unknown>> {
  try {
    // Profiles require a corresponding auth.users row (FK constraint).
    // Create a dummy auth user — the handle_new_user trigger auto-creates the profile.
    const ghostEmail = `ghost_${crypto.randomUUID()}@ghost.internal`;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: ghostEmail,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    });

    if (authError || !authData.user) {
      return { data: null, error: { code: authError?.status?.toString() ?? 'AUTH_ERROR', message: authError?.message ?? 'Failed to create ghost auth user' } };
    }

    const ghostId = authData.user.id;

    // Mark the auto-created profile as a ghost
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .update({ is_ghost: true })
      .eq('id', ghostId)
      .select()
      .single();

    if (profileError) {
      // Clean up the auth user if profile update fails
      await adminClient.auth.admin.deleteUser(ghostId);
      return { data: null, error: { code: profileError.code, message: profileError.message } };
    }

    const { data: member, error: memberError } = await adminClient
      .from('competition_members')
      .insert({
        competition_id: competitionId,
        profile_id: ghostId,
        role: 'competitor',
        status: 'active',
      })
      .select()
      .single();

    if (memberError) {
      await adminClient.auth.admin.deleteUser(ghostId);
      return { data: null, error: { code: memberError.code, message: memberError.message } };
    }

    return { data: { profile, member }, error: null };
  } catch (err) {
    return { data: null, error: { code: 'UNKNOWN', message: err instanceof Error ? err.message : 'An unexpected error occurred' } };
  }
}
