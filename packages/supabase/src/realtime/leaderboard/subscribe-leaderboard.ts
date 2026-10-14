/*
 * This file defines the subscribe leaderboard module.
 */

// Subscribes to competition_members updates for live leaderboard refresh.
import type { SupabaseClient } from '@supabase/supabase-js';

// Handles subscribe leaderboard.
export function subscribeLeaderboard(
  client: SupabaseClient,
  competitionId: string,
  onUpdate: (member: unknown) => void,
): () => void {
  const channel = client
    .channel(`leaderboard:${competitionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'competition_members',
        filter: `competition_id=eq.${competitionId}`,
      },
      (payload) => onUpdate(payload.new),
    )
    .subscribe();

  return () => { void client.removeChannel(channel); };
}
