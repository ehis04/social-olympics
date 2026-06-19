// POST /api/competitions/[id]/tiebreakers/[tiebreakerId]/resolve — host resolves tiebreaker by margin
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition } from '@repo/supabase';
import { resolveByMargin } from '@repo/scoring';
import type { NominationResult } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: { id: string; tiebreakerId: string };
}

interface TiebreakerRow {
  id: string;
  profile_id_a: string;
  profile_id_b: string;
  status: string;
}

interface NominationRow {
  nominating_profile_id: string;
  nominated_event_id: string;
  revealed_at: string | null;
}

interface ResultRow {
  profile_id: string;
  result_value_primary: number | null;
  competition_event_id: string;
}

interface EventRow {
  id: string;
  events: { result_type: string } | null;
}

export async function POST(_request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id) return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Host only' } }, { status: 403 });

  const { data: tbData, error: tbError } = await client
    .from('tiebreakers')
    .select('id, profile_id_a, profile_id_b, status')
    .eq('id', params.tiebreakerId)
    .eq('competition_id', params.id)
    .single();

  if (tbError || !tbData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Tiebreaker not found' } }, { status: 404 });

  const tiebreaker = tbData as TiebreakerRow;
  const tiedProfileIds = [tiebreaker.profile_id_a, tiebreaker.profile_id_b];

  // Fetch both revealed nominations
  const { data: nominationsData } = await client
    .from('tiebreaker_nominations')
    .select('nominating_profile_id, nominated_event_id, revealed_at')
    .eq('tiebreaker_id', params.tiebreakerId)
    .not('revealed_at', 'is', null);

  const nominations = (nominationsData ?? []) as NominationRow[];
  if (nominations.length < 2) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Both nominations must be revealed before resolving' } }, { status: 400 });
  }

  const [nomA, nomB] = nominations as [NominationRow, NominationRow];

  // Fetch results for both competitors in both nominated events
  const eventIds = [nomA.nominated_event_id, nomB.nominated_event_id];
  const { data: resultsData } = await client
    .from('results')
    .select('profile_id, result_value_primary, competition_event_id')
    .in('competition_event_id', eventIds)
    .in('profile_id', tiedProfileIds)
    .not('confirmed_at', 'is', null);

  const results = (resultsData ?? []) as ResultRow[];

  // Fetch result_type for each nominated event
  const { data: eventsData } = await client
    .from('competition_events')
    .select('id, events(result_type)')
    .in('id', eventIds);

  const events = (eventsData ?? []) as EventRow[];

  function getResult(profileId: string, eventId: string): number {
    return results.find((r) => r.profile_id === profileId && r.competition_event_id === eventId)?.result_value_primary ?? 0;
  }

  function getResultType(eventId: string): string {
    return events.find((e) => e.id === eventId)?.events?.result_type ?? 'score';
  }

  const nominationResultA: NominationResult = {
    profileId: nomA.nominating_profile_id,
    nominatedEventId: nomA.nominated_event_id,
    resultValuePrimary: getResult(nomA.nominating_profile_id, nomA.nominated_event_id),
    opponentResultValuePrimary: getResult(nomB.nominating_profile_id, nomA.nominated_event_id),
    resultType: getResultType(nomA.nominated_event_id),
  };

  const nominationResultB: NominationResult = {
    profileId: nomB.nominating_profile_id,
    nominatedEventId: nomB.nominated_event_id,
    resultValuePrimary: getResult(nomB.nominating_profile_id, nomB.nominated_event_id),
    opponentResultValuePrimary: getResult(nomA.nominating_profile_id, nomB.nominated_event_id),
    resultType: getResultType(nomB.nominated_event_id),
  };

  const winner = resolveByMargin(nominationResultA, nominationResultB);
  const resolvedBy = winner ? 'raw_margin' : 'host';

  await client
    .from('tiebreakers')
    .update({
      status: 'resolved',
      resolved_by: resolvedBy,
      winner_profile_id: winner,
    })
    .eq('id', params.tiebreakerId);

  return NextResponse.json({ data: { winner_profile_id: winner, resolved_by: resolvedBy }, error: null });
}
