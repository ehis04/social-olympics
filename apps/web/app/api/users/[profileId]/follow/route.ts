/*
 * This file handles requests for the follow API route.
 */

// GET/POST/DELETE /api/users/[profileId]/follow — follow status and mutations
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { createNotification } from '@/lib/notifications/create-notification';
import { isBlockedBetween } from '@/lib/social/blocks';

interface Params {
  params: Promise<{ profileId: string }>;
}

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at?: string;
};

// Handles untyped.
function untyped(client: SupabaseClient): SupabaseClient {
  return client;
}

// Handles get counts.
async function getCounts(client: SupabaseClient, profileId: string) {
  const db = untyped(client);
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    db
      .from('profile_follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', profileId),
    db
      .from('profile_follows')
      .select('following_id', { count: 'exact', head: true })
      .eq('follower_id', profileId),
  ]);

  return {
    followersCount: followersCount ?? 0,
    followingCount: followingCount ?? 0,
  };
}

// Handles get follow state.
async function getFollowState(client: SupabaseClient, currentUserId: string, profileId: string) {
  const db = untyped(client);
  const { data } = await db
    .from('profile_follows')
    .select('follower_id, following_id')
    .eq('follower_id', currentUserId)
    .eq('following_id', profileId)
    .maybeSingle();

  const counts = await getCounts(client, profileId);
  return {
    isFollowing: Boolean(data as FollowRow | null),
    ...counts,
  };
}

// Handles get.
export async function GET(_request: Request, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { profileId } = await params;
  const state = await getFollowState(client, user.id, profileId);
  return NextResponse.json({ data: state });
}

// Handles post.
export async function POST(_request: Request, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { profileId } = await params;
  if (profileId === user.id) {
    return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const { data: target } = await adminClient
    .from('profiles')
    .select('deleted_at, is_ghost')
    .eq('id', profileId)
    .maybeSingle();
  if (!target || target.deleted_at || target.is_ghost) {
    return NextResponse.json({ error: 'This profile cannot be followed' }, { status: 404 });
  }
  if (await isBlockedBetween(client, user.id, profileId)) {
    return NextResponse.json({ error: 'You cannot follow this person' }, { status: 403 });
  }

  const db = untyped(client);
  const { error } = await db.from('profile_follows').upsert({
    follower_id: user.id,
    following_id: profileId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: follower } = await adminClient
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .maybeSingle();

  await createNotification(adminClient, {
    profileId,
    type: 'new_follower',
    title: 'New follower',
    body: `${follower?.display_name ?? 'Someone'} followed you.`,
    data: { follower_profile_id: user.id },
  });

  const state = await getFollowState(client, user.id, profileId);
  return NextResponse.json({ data: state });
}

// Handles delete.
export async function DELETE(_request: Request, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { profileId } = await params;
  const db = untyped(client);
  const { error } = await db
    .from('profile_follows')
    .delete()
    .eq('follower_id', user.id)
    .eq('following_id', profileId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const state = await getFollowState(client, user.id, profileId);
  return NextResponse.json({ data: state });
}
