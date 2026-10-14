/*
 * This file handles requests for the block API route.
 */

// GET /api/users/[profileId]/block — whether the caller has blocked this profile, and whether
// a block in either direction stops the two of them messaging.
// POST — block the profile. DELETE — unblock it.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { isBlockedBetween } from '@/lib/social/blocks';

interface Params {
  params: Promise<{ profileId: string }>;
}

const UUID = /^[0-9a-f-]{36}$/i;

// Handles get.
export async function GET(_req: NextRequest, { params }: Params) {
  const { profileId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const [{ data }, blockedEitherWay] = await Promise.all([
    client
      .from('profile_blocks')
      .select('blocked_id')
      .eq('blocker_id', user.id)
      .eq('blocked_id', profileId)
      .maybeSingle(),
    isBlockedBetween(client, user.id, profileId),
  ]);
  return NextResponse.json({ data: { blocked: !!data, blockedEitherWay } });
}

// Handles post.
export async function POST(_req: NextRequest, { params }: Params) {
  const { profileId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!UUID.test(profileId)) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  if (profileId === user.id) return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });

  const { error } = await client
    .from('profile_blocks')
    .upsert({ blocker_id: user.id, blocked_id: profileId }, { onConflict: 'blocker_id,blocked_id' });
  if (error) return NextResponse.json({ error: 'Failed to block this person' }, { status: 500 });

  // Blocking also stops following in both directions where the caller controls the row.
  await client.from('profile_follows').delete().eq('follower_id', user.id).eq('following_id', profileId);

  return NextResponse.json({ data: { blocked: true } });
}

// Handles delete.
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { profileId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { error } = await client
    .from('profile_blocks')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', profileId);
  if (error) return NextResponse.json({ error: 'Failed to unblock this person' }, { status: 500 });

  return NextResponse.json({ data: { blocked: false } });
}
