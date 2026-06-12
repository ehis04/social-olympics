// Fetches paginated group chat messages for a competition.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResponse, PaginationParams } from '@repo/types';

export async function getGroupChat(
  client: SupabaseClient,
  competitionId: string,
  params: PaginationParams = {},
): Promise<PaginatedResponse<unknown>> {
  try {
    const limit = params.limit ?? 20;

    let query = client
      .from('messages')
      .select('*, sender:profiles!messages_sender_profile_id_fkey(id, display_name, avatar_url)')
      .eq('competition_id', competitionId)
      .eq('message_type', 'group_chat')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limit + 1);

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
