// Subscribes to new activity_feed inserts for a competition.
import type { SupabaseClient } from '@supabase/supabase-js';

export function subscribeFeed(
  client: SupabaseClient,
  competitionId: string,
  onNewItem: (item: unknown) => void,
): () => void {
  const channel = client
    .channel(`feed:${competitionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_feed',
        filter: `competition_id=eq.${competitionId}`,
      },
      (payload) => onNewItem(payload.new),
    )
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
