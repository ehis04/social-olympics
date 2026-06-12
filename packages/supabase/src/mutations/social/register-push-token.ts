// Registers or refreshes a push notification token for a profile.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function registerPushToken(
  client: SupabaseClient,
  token: string,
  platform: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('push_tokens')
      .upsert(
        { token, platform, last_used_at: new Date().toISOString() },
        { onConflict: 'profile_id,token' },
      )
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
