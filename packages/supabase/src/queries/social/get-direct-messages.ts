// Fetches paginated direct messages between two profiles.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { PaginatedResponse, PaginationParams } from '@repo/types';

export async function getDirectMessages(
  client: SupabaseClient,
  profileIdA: string,
  profileIdB: string,
  params: PaginationParams = {},
): Promise<PaginatedResponse<unknown>> {
  try {
    const limit = params.limit ?? 20;

    let query = client
      .from('messages')
      .select('*, sender:profiles!messages_sender_profile_id_fkey(id, display_name, avatar_url)')
      .eq('message_type', 'direct_message')
      .is('deleted_at', null)
      .or(
        `and(sender_profile_id.eq.${profileIdA},recipient_profile_id.eq.${profileIdB}),and(sender_profile_id.eq.${profileIdB},recipient_profile_id.eq.${profileIdA})`,
      )
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
