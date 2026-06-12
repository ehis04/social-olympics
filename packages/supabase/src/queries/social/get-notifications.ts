// Fetches paginated notifications for a profile, optionally unread only.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResponse, PaginationParams } from '@repo/types';

export async function getNotifications(
  client: SupabaseClient,
  profileId: string,
  params: PaginationParams & { unreadOnly?: boolean } = {},
): Promise<PaginatedResponse<unknown>> {
  try {
    const limit = params.limit ?? 20;

    let query = client
      .from('notifications')
      .select('*')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

    if (params.unreadOnly) query = query.is('read_at', null);
    if (params.cursor) query = query.lt('created_at', params.cursor);

    const { data, error } = await query;
    if (error) return { data: null, error: { code: error.code, message: error.message }, hasMore: false };

    const items = data ?? [];
    const hasMore = items.length > limit;
    const results = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? (results[results.length - 1] as { created_at: string } | undefined)?.created_at : undefined;

    return { data: results, error: null, hasMore, nextCursor };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' }, hasMore: false };
  }
}
