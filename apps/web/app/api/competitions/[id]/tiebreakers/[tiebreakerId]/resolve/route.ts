/*
 * This file handles requests for the resolve tiebreaker API route.
 */

// POST /api/competitions/[id]/tiebreakers/[tiebreakerId]/resolve — host settles a tiebreaker.
// With winner_profile_id the host decides directly; without it the nominated events are compared.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { winnerFromNominations } from '@/lib/tiebreakers/resolve';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: Promise<{ id: string; tiebreakerId: string }>;
}

// Handles post.
export async function POST(request: NextRequest, { params }: Params) {
  const { id, tiebreakerId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Competition not found' } }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Host only' } }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'This competition is finished.' } }, { status: 409 });
  }

  const { data: tiebreaker } = await adminClient
    .from('tiebreakers')
    .select('id, profile_id_a, profile_id_b, status')
    .eq('id', tiebreakerId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!tiebreaker) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Tiebreaker not found' } }, { status: 404 });
  if (tiebreaker.status === 'resolved') {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'Tiebreaker is already resolved' } }, { status: 409 });
  }

  let body: { winner_profile_id?: string } = {};
  try {
    body = (await request.json()) as { winner_profile_id?: string };
  } catch {
    // An empty body asks the server to compare the nominated events.
  }

  const tiedProfileIds = [tiebreaker.profile_id_a as string, tiebreaker.profile_id_b as string];
  let winner: string | null = null;
  let resolvedBy: 'host' | 'event_nomination' = 'host';

  if (body.winner_profile_id) {
    if (!tiedProfileIds.includes(body.winner_profile_id)) {
      return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'The winner must be one of the tied competitors' } }, { status: 400 });
    }
    winner = body.winner_profile_id;
  } else {
    const outcome = await winnerFromNominations(adminClient, {
      id: tiebreakerId,
      profile_id_a: tiedProfileIds[0]!,
      profile_id_b: tiedProfileIds[1]!,
    });
    if (!outcome.ready) {
      return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Both nominations are needed, or choose the winner yourself' } }, { status: 400 });
    }
    if (!outcome.winner) {
      return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'Results remain tied; choose the winner yourself' } }, { status: 409 });
    }
    winner = outcome.winner;
    resolvedBy = 'event_nomination';
  }

  const { error: resolutionError } = await adminClient
    .from('tiebreakers')
    .update({ status: 'resolved', resolved_by: resolvedBy, winner_profile_id: winner })
    .eq('id', tiebreakerId);
  if (resolutionError) return NextResponse.json({ data: null, error: { code: resolutionError.code, message: resolutionError.message } }, { status: 500 });

  await createNotifications(
    adminClient,
    tiedProfileIds.map((profileId) => ({
      profileId,
      type: 'tiebreaker_resolved',
      title: 'Tiebreaker settled',
      body: `${resolvedBy === 'host' ? 'The host settled' : 'The nominated events settled'} your tie in ${competition.name}.`,
      data: { competition_id: id, href: `/competitions/${id}/leaderboard` },
    })),
  );

  return NextResponse.json({ data: { winner_profile_id: winner, resolved_by: resolvedBy }, error: null });
}
