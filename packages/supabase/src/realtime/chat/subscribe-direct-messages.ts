// Subscribes to new direct messages between two profiles (client-side pair filtering).
import type { SupabaseClient } from '@supabase/supabase-js';

export function subscribeDirectMessages(
  client: SupabaseClient,
  profileIdA: string,
  profileIdB: string,
  onNewMessage: (message: unknown) => void,
): () => void {
  const channel = client
    .channel(`dm:${[profileIdA, profileIdB].sort().join(':')}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `message_type=eq.direct_message`,
      },
      (payload) => {
        const msg = payload.new as {
          sender_profile_id: string;
          recipient_profile_id: string;
        };
        // Client-side filter: only pass messages for this A↔B pair
        const isMatch =
          (msg.sender_profile_id === profileIdA && msg.recipient_profile_id === profileIdB) ||
          (msg.sender_profile_id === profileIdB && msg.recipient_profile_id === profileIdA);

        if (isMatch) onNewMessage(payload.new);
      },
    )
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
