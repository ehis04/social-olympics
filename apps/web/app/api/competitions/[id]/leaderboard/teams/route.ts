// GET /api/competitions/[id]/leaderboard/teams — team leaderboard for a competition
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getTeamLeaderboard, getCompetitionMembers } from '@repo/supabase';
import type { Database } from '@repo/types';

type MemberWithProfile = Pick<
  Database['public']['Tables']['competition_members']['Row'],
  'profile_id'
>;

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: memberData } = await getCompetitionMembers(client, (await params).id);
  const members = (memberData ?? []) as MemberWithProfile[];
  const isMember = members.some((m) => m.profile_id === user.id);
  if (!isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await getTeamLeaderboard(client, (await params).id);
  if (error) return NextResponse.json({ error: 'Failed to fetch team leaderboard' }, { status: 500 });

  return NextResponse.json({ data: data ?? [], error: null });
}
