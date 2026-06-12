// Updates a competition member's role.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function updateMemberRole(
  client: SupabaseClient,
  memberId: string,
  role: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('competition_members')
      .update({ role })
      .eq('id', memberId)
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
