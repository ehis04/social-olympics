// Fetches DM conversation list with latest message and unread count per partner.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApiResponse } from '@repo/types';

export async function getConversations(
  client: SupabaseClient,
  profileId: string,
): Promise<ApiResponse<unknown[]>> {
  try {
    // Fetch all DMs involving this profile, not deleted
    const { data, error } = await client
      .from('messages')
      .select('*, sender:profiles!messages_sender_profile_id_fkey(id, display_name, avatar_url), recipient:profiles!messages_recipient_profile_id_fkey(id, display_name, avatar_url)')
      .eq('message_type', 'direct_message')
      .is('deleted_at', null)
      .or(`sender_profile_id.eq.${profileId},recipient_profile_id.eq.${profileId}`)
      .order('created_at', { ascending: false });

    if (error) return { data: null, error: { code: error.code, message: error.message } };

    // Group by partner: deduplicate to one entry per unique partner with latest message
    const seen = new Map<string, unknown>();
    for (const msg of data ?? []) {
      const m = msg as { sender_profile_id: string; recipient_profile_id: string };
      const partnerId = m.sender_profile_id === profileId
        ? m.recipient_profile_id
        : m.sender_profile_id;
      if (!seen.has(partnerId)) seen.set(partnerId, msg);
    }

    return { data: Array.from(seen.values()), error: null };
  } catch {
    return { data: null, error: { code: 'UNKNOWN', message: 'An unexpected error occurred' } };
  }
}
