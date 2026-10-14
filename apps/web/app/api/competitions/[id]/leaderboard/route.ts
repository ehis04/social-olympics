/*
 * This file handles requests for the leaderboard API route.
 */

// GET /api/competitions/[id]/leaderboard — ranked leaderboard for a competition
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getLeaderboard, getCompetitionMembers } from '@repo/supabase';
import { rankStandings } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionMemberRow = Database['public']['Tables']['competition_members']['Row'];
type ProfileSummary = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'avatar_url' | 'country_code'
>;
type MemberWithProfile = CompetitionMemberRow & {
  profiles?: ProfileSummary | null;
};

interface Params {
  params: Promise<{ id: string }>;
}

// Handles get.
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

  const { data, error } = await getLeaderboard(client, (await params).id);
  if (error) return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });

  // Competitors appear on the board; people who left keep their place if they already scored.
  const entries = ((data ?? []) as MemberWithProfile[]).filter((member) =>
    member.role === 'competitor' &&
    (member.status === 'active' || (member.status === 'withdrawn' && (member.events_completed ?? 0) > 0)),
  );

  const merged = rankStandings(
    entries.map((member) => ({ ...member, total_points: Number(member.total_points ?? 0) })),
  );

  return NextResponse.json({ data: merged, error: null });
}
