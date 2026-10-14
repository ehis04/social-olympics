/*
 * This file defines the register push token module.
 */

// Registers or refreshes a push notification token for a profile.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

// Handles register push token.
export async function registerPushToken(
  client: SupabaseClient,
  profileId: string,
  token: string,
  platform: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('push_tokens')
      .upsert(
        { profile_id: profileId, token, platform, last_used_at: new Date().toISOString() },
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

// Removes this device's token when the user signs out, so the device stops getting their pushes.
export async function unregisterPushToken(
  client: SupabaseClient,
  profileId: string,
  token: string,
): Promise<ApiResponse<null>> {
  try {
    const { error } = await client.from('push_tokens').delete().eq('profile_id', profileId).eq('token', token);
    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: null, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
