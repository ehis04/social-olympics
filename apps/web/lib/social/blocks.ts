/*
 * This file reads user blocks for filtering content and checking messages.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

// Profiles the viewer has blocked. Uses the viewer's client, which only sees their own blocks.
export async function getBlockedIds(client: SupabaseClient, viewerId: string): Promise<Set<string>> {
  const { data } = await client.from('profile_blocks').select('blocked_id').eq('blocker_id', viewerId);
  return new Set((data ?? []).map((row) => row.blocked_id as string));
}

// True when either person has blocked the other.
export async function isBlockedBetween(client: SupabaseClient, a: string, b: string): Promise<boolean> {
  const { data } = await client.rpc('is_blocked_between', { a, b });
  return data === true;
}
