// Fetches all personal bests for a profile with event and category info.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getPersonalBests(
  client: SupabaseClient,
  profileId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    const { data, error } = await client
      .from('personal_bests')
      .select('*, events(name, slug, result_type, event_categories(name))')
      .eq('profile_id', profileId)
      .order('events(name)', { ascending: true });

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data: data ?? [], error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
