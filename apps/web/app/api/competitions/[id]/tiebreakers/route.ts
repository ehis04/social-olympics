// POST /api/competitions/[id]/tiebreakers — host initiates a tiebreaker between two competitors
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition } from '@repo/supabase';
import { resolveByMedals } from '@repo/scoring';
import type { TiebreakerCandidate } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'];

interface Params {
  params: { id: string };
}

interface RequestBody {
  profile_id_a: string;
  profile_id_b: string;
}

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id) return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Host only' } }, { status: 403 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { profile_id_a, profile_id_b } = body;
  if (!profile_id_a || !profile_id_b) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'profile_id_a and profile_id_b are required' } }, { status: 400 });
  }

  // Fetch medal counts for both competitors
  const { data: membersData } = await client
    .from('competition_members')
    .select('profile_id, gold_count, silver_count, bronze_count')
    .eq('competition_id', params.id)
    .in('profile_id', [profile_id_a, profile_id_b]);

  const members = (membersData ?? []) as Pick<MemberRow, 'profile_id' | 'gold_count' | 'silver_count' | 'bronze_count'>[];

  const memberA = members.find((m) => m.profile_id === profile_id_a);
  const memberB = members.find((m) => m.profile_id === profile_id_b);

  if (!memberA || !memberB) {
    return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'One or both competitors not found in this competition' } }, { status: 404 });
  }

  const candidateA: TiebreakerCandidate = {
    profileId: profile_id_a,
    gold: memberA.gold_count ?? 0,
    silver: memberA.silver_count ?? 0,
    bronze: memberA.bronze_count ?? 0,
  };
  const candidateB: TiebreakerCandidate = {
    profileId: profile_id_b,
    gold: memberB.gold_count ?? 0,
    silver: memberB.silver_count ?? 0,
    bronze: memberB.bronze_count ?? 0,
  };

  const medalWinner = resolveByMedals(candidateA, candidateB);

  if (medalWinner) {
    // Resolved by medals — insert tiebreaker row as already resolved
    const { data: tiebreaker, error: tbError } = await client
      .from('tiebreakers')
      .insert({
        competition_id: params.id,
        profile_id_a,
        profile_id_b,
        status: 'resolved',
        resolved_by: 'medal_count',
        winner_profile_id: medalWinner,
      })
      .select()
      .single();

    if (tbError) return NextResponse.json({ data: null, error: { code: tbError.code, message: tbError.message } }, { status: 500 });

    return NextResponse.json({ data: { resolved: true, winner_profile_id: medalWinner, tiebreaker }, error: null });
  }

  // Not resolved by medals — create pending nomination tiebreaker
  const { data: tiebreaker, error: tbError } = await client
    .from('tiebreakers')
    .insert({
      competition_id: params.id,
      profile_id_a,
      profile_id_b,
      status: 'pending_nomination',
      resolved_by: null,
      winner_profile_id: null,
    })
    .select()
    .single();

  if (tbError) return NextResponse.json({ data: null, error: { code: tbError.code, message: tbError.message } }, { status: 500 });

  const tb = tiebreaker as { id: string };

  // Notify both tied competitors via edge function
  await client.functions.invoke('send-notification', {
    body: {
      competition_id: params.id,
      tiebreaker_id: tb.id,
      profile_ids: [profile_id_a, profile_id_b],
      type: 'tiebreaker_required',
    },
  });

  return NextResponse.json({ data: { resolved: false, tiebreaker_id: tb.id }, error: null });
}
