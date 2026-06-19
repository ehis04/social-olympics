// GET /api/competitions/[id]/feed — paginated activity feed
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getFeed, getCompetitionMembers } from '@repo/supabase';
import type { Database } from '@repo/types';

type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Params {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: membersData } = await getCompetitionMembers(client, params.id);
  const members = (membersData ?? []) as MemberRow[];
  const isMember = members.some((m) => m.profile_id === user.id);
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const cursor = url.searchParams.get('cursor') ?? undefined;
  const limit = Number(url.searchParams.get('limit') ?? 20);
  const pagination = cursor ? { cursor, limit } : { limit };

  const result = await getFeed(client, params.id, pagination);
  if (result.error) return NextResponse.json({ error: 'Failed to fetch feed' }, { status: 500 });

  return NextResponse.json({ data: result.data, hasMore: result.hasMore, nextCursor: result.nextCursor });
}
