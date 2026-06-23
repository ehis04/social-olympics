// GET /api/competitions/[id]/leaderboard — ranked leaderboard for a competition
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getLeaderboard, getCompetitionMembers } from '@repo/supabase';
import { rankEntries } from '@repo/scoring';
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

  const entries = (data ?? []) as MemberWithProfile[];

  const ranked = rankEntries(
    entries.map((m) => ({
      profileId: m.profile_id,
      totalPoints: m.total_points ?? 0,
      gold: m.gold_count ?? 0,
      silver: m.silver_count ?? 0,
      bronze: m.bronze_count ?? 0,
    })),
  );

  const merged = ranked
    .map((r) => {
      const member = entries.find((m) => m.profile_id === r.profileId);
      if (!member) return null;
      return { ...member, rank: r.rank, isTied: r.isTied };
    })
    .filter(
      (member): member is MemberWithProfile & { rank: number; isTied: boolean } =>
        member !== null,
    );

  return NextResponse.json({ data: merged, error: null });
}
