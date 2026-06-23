// GET/POST/DELETE /api/users/[profileId]/follow — follow status and mutations
import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { createNotification } from '@/lib/notifications/create-notification';

interface Params {
  params: Promise<{ profileId: string }>;
}

type FollowRow = {
  follower_id: string;
  following_id: string;
  created_at?: string;
};

function untyped(client: SupabaseClient): SupabaseClient {
  return client;
}

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

  const db = untyped(client);
  const { error } = await db.from('profile_follows').upsert({
    follower_id: user.id,
    following_id: profileId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const adminClient = createAdminClient();
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
