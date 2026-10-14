/*
 * This file handles requests for the blocked users API route.
 */

// GET /api/users/blocked — people the caller has blocked, for managing blocks in settings.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

// Handles get.
export async function GET() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await client
    .from('profile_blocks')
    .select('blocked_id, created_at, profile:profiles!profile_blocks_blocked_id_fkey(id, display_name, avatar_url)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: 'Failed to load blocked people' }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}
