// Adds a comment to a feed item.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function addFeedComment(
  client: SupabaseClient,
  feedItemId: string,
  content: string,
  profileId: string,
): Promise<ApiResponse<unknown>> {
  try {
    const { data, error } = await client
      .from('feed_comments')
      .insert({ feed_item_id: feedItemId, content, profile_id: profileId })
      .select()
      .single();

    if (error) return { data: null, error: { code: error.code, message: error.message } };
    return { data, error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
