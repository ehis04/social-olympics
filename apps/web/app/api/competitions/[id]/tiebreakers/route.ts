/*
 * This file handles requests for the tiebreakers API route.
 */

// GET /api/competitions/[id]/tiebreakers — tiebreakers as the caller sees them (sealed picks stay hidden).
// POST — host starts a tiebreaker between two tied competitors
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import { resolveByMedals } from '@repo/scoring';
import type { TiebreakerCandidate } from '@repo/scoring';
import { createNotifications } from '@/lib/notifications/create-notification';
import { getTiebreakerInfos } from '@/lib/tiebreakers/state';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Params {
  params: Promise<{ id: string }>;
}

interface RequestBody {
  profile_id_a?: string;
  profile_id_b?: string;
}

// Handles get.
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const tiebreakers = await getTiebreakerInfos(client, id, user.id);
  return NextResponse.json({ data: tiebreakers, error: null });
}

// Handles post.
export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Only the host can start a tiebreaker' } }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'This competition is finished.' } }, { status: 409 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { profile_id_a, profile_id_b } = body;
  if (!profile_id_a || !profile_id_b || profile_id_a === profile_id_b) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Choose two different competitors' } }, { status: 400 });
  }

  const { data: existing } = await adminClient
    .from('tiebreakers')
    .select('id, status')
    .eq('competition_id', id)
    .or(`and(profile_id_a.eq.${profile_id_a},profile_id_b.eq.${profile_id_b}),and(profile_id_a.eq.${profile_id_b},profile_id_b.eq.${profile_id_a})`)
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'A tiebreaker already exists for these competitors' } }, { status: 409 });
  }

  const { data: membersData } = await adminClient
    .from('competition_members')
    .select('profile_id, total_points, gold_count, silver_count, bronze_count')
    .eq('competition_id', id)
    .eq('status', 'active')
    .eq('role', 'competitor')
    .in('profile_id', [profile_id_a, profile_id_b]);

  const members = (membersData ?? []) as Pick<MemberRow, 'profile_id' | 'total_points' | 'gold_count' | 'silver_count' | 'bronze_count'>[];
  const memberA = members.find((m) => m.profile_id === profile_id_a);
  const memberB = members.find((m) => m.profile_id === profile_id_b);
  if (!memberA || !memberB) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Both players must be active competitors in this competition' } }, { status: 404 });
  }
  if (Number(memberA.total_points) !== Number(memberB.total_points)) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'These competitors are not tied on points' } }, { status: 400 });
  }

  const candidate = (member: typeof memberA): TiebreakerCandidate => ({
    profileId: member.profile_id,
    gold: member.gold_count ?? 0,
    silver: member.silver_count ?? 0,
    bronze: member.bronze_count ?? 0,
  });
  const medalWinner = resolveByMedals(candidate(memberA), candidate(memberB));

  const { data: tiebreaker, error: tbError } = await adminClient
    .from('tiebreakers')
    .insert({
      competition_id: id,
      profile_id_a,
      profile_id_b,
      status: medalWinner ? 'resolved' : 'pending_nomination',
      resolved_by: medalWinner ? 'medal_count' : null,
      winner_profile_id: medalWinner,
    })
    .select()
    .single();
  if (tbError || !tiebreaker) {
    return NextResponse.json({ data: null, error: { code: tbError?.code ?? 'UNKNOWN', message: tbError?.message ?? 'Failed to start tiebreaker' } }, { status: 500 });
  }

  await createNotifications(
    adminClient,
    [profile_id_a, profile_id_b].map((profileId) => ({
      profileId,
      type: medalWinner ? 'tiebreaker_resolved' : 'tiebreaker_required',
      title: medalWinner ? 'Tie settled on medals' : 'Tiebreaker: nominate an event',
      body: medalWinner
        ? `Your tie in ${competition.name} was settled on medal count.`
        : `You are tied in ${competition.name}. Nominate one event you both competed in; nominations stay hidden until both are in.`,
      data: { competition_id: id, href: `/competitions/${id}/leaderboard` },
    })),
  );

  return NextResponse.json({
    data: medalWinner
      ? { resolved: true, winner_profile_id: medalWinner, tiebreaker }
      : { resolved: false, tiebreaker_id: (tiebreaker as { id: string }).id },
    error: null,
  });
}
