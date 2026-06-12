// Marks all or specific notifications as read for a profile.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function markNotificationsRead(
  client: SupabaseClient,
  profileId: string,
  ids?: string[],
): Promise<ApiResponse<void>> {
  try {
    let query = client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('profile_id', profileId)
      .is('read_at', null);

    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { error } = await query;
    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: undefined, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
