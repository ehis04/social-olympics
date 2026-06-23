// POST /api/competitions/[id]/tiebreakers/[tiebreakerId]/nominate — competitor nominates a sealed event
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { submitTiebreakerNomination } from '@repo/supabase';

interface Params {
  params: Promise<{ id: string; tiebreakerId: string }>;
}

interface RequestBody {
  nominated_event_id: string;
}

interface TiebreakerRow {
  id: string;
  profile_id_a: string;
  profile_id_b: string;
  status: string;
}

interface ResultRow {
  profile_id: string;
  competition_event_id: string;
  confirmed_at: string | null;
}

export async function POST(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  // Fetch the tiebreaker to verify this user is one of the two tied competitors
  const { data: tbData, error: tbError } = await client
    .from('tiebreakers')
    .select('id, profile_id_a, profile_id_b, status')
    .eq('id', (await params).tiebreakerId)
    .eq('competition_id', (await params).id)
    .single();

  if (tbError || !tbData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Tiebreaker not found' } }, { status: 404 });

  const tiebreaker = tbData as TiebreakerRow;
  const tiedProfileIds = [tiebreaker.profile_id_a, tiebreaker.profile_id_b];

  if (!tiedProfileIds.includes(user.id)) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'You are not part of this tiebreaker' } }, { status: 403 });
  }

  if (tiebreaker.status !== 'pending_nomination') {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Tiebreaker is not awaiting nominations' } }, { status: 400 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { nominated_event_id } = body;
  if (!nominated_event_id) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'nominated_event_id is required' } }, { status: 400 });
  }

  // Validate both tied competitors have confirmed results in this event
  const { data: resultsData } = await client
    .from('results')
    .select('profile_id, competition_event_id, confirmed_at')
    .eq('competition_event_id', nominated_event_id)
    .in('profile_id', tiedProfileIds);

  const results = (resultsData ?? []) as ResultRow[];
  const confirmedForBoth = tiedProfileIds.every((pid) =>
    results.some((r) => r.profile_id === pid && r.confirmed_at !== null),
  );

  if (!confirmedForBoth) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Both competitors must have confirmed results in the nominated event' } }, { status: 400 });
  }

  const { data, error } = await submitTiebreakerNomination(client, {
    tiebreaker_id: (await params).tiebreakerId,
    nominating_profile_id: user.id,
    nominated_event_id,
    submitted_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });

  return NextResponse.json({
    data: {
      submitted: true,
      bothSubmitted: data?.bothRevealed ?? false,
    },
    error: null,
  });
}
