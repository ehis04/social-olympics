// Subscribes to new group chat messages for a competition.
import type { SupabaseClient } from '@supabase/supabase-js';

export function subscribeGroupChat(
  client: SupabaseClient,
  competitionId: string,
  onNewMessage: (message: unknown) => void,
): () => void {
  const channel = client
    .channel(`group-chat:${competitionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `competition_id=eq.${competitionId}`,
      },
      (payload) => onNewMessage(payload.new),
    )
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
