/*
 * This file handles requests for the nominate API route.
 */

// POST /api/competitions/[id]/tiebreakers/[tiebreakerId]/nominate — a tied competitor nominates a sealed event.
// When both nominations are in they are revealed and the tie is settled if the results allow.
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { winnerFromNominations } from '@/lib/tiebreakers/resolve';

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
  const { data: tiebreaker } = await adminClient
    .from('tiebreakers')
    .select('id, profile_id_a, profile_id_b, status, competitions(name, host_id, cohost_id, status)')
    .eq('id', tiebreakerId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!tiebreaker) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Tiebreaker not found' } }, { status: 404 });

  const competition = tiebreaker.competitions as unknown as { name: string; host_id: string; cohost_id: string | null; status: string } | null;
  if (!competition || ['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'This competition is finished.' } }, { status: 409 });
  }
  const tiedProfileIds = [tiebreaker.profile_id_a as string, tiebreaker.profile_id_b as string];
  if (!tiedProfileIds.includes(user.id)) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'You are not part of this tiebreaker' } }, { status: 403 });
  }
  if (!['pending_nomination', 'nominated'].includes(tiebreaker.status as string)) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'This tiebreaker is no longer taking nominations' } }, { status: 409 });
  }

  let body: { nominated_event_id?: string };
  try {
    body = (await request.json()) as { nominated_event_id?: string };
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }
  const nominatedEventId = body.nominated_event_id;
  if (!nominatedEventId) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Choose an event to nominate' } }, { status: 400 });
  }

  const { data: event } = await adminClient
    .from('competition_events')
    .select('id')
    .eq('id', nominatedEventId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Event not found in this competition' } }, { status: 400 });

  const { data: results } = await adminClient
    .from('results')
    .select('profile_id')
    .eq('competition_event_id', nominatedEventId)
    .in('profile_id', tiedProfileIds)
    .not('confirmed_at', 'is', null)
    .not('result_value_primary', 'is', null);
  const confirmedForBoth = tiedProfileIds.every((profileId) => (results ?? []).some((r) => r.profile_id === profileId));
  if (!confirmedForBoth) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Both competitors need a confirmed result in the nominated event' } }, { status: 400 });
  }

  const { error: insertError } = await adminClient.from('tiebreaker_nominations').insert({
    tiebreaker_id: tiebreakerId,
    nominating_profile_id: user.id,
    nominated_event_id: nominatedEventId,
  });
  if (insertError) {
    const duplicate = insertError.code === '23505';
    return NextResponse.json(
      { data: null, error: { code: duplicate ? 'ALREADY_NOMINATED' : insertError.code, message: duplicate ? 'You have already nominated an event' : insertError.message } },
      { status: duplicate ? 409 : 500 },
    );
  }

  const { ready, winner } = await winnerFromNominations(adminClient, {
    id: tiebreakerId,
    profile_id_a: tiedProfileIds[0]!,
    profile_id_b: tiedProfileIds[1]!,
  });

  if (!ready) {
    await adminClient.from('tiebreakers').update({ status: 'nominated' }).eq('id', tiebreakerId);
    return NextResponse.json({ data: { submitted: true, bothSubmitted: false }, error: null });
  }

  await adminClient
    .from('tiebreaker_nominations')
    .update({ revealed_at: new Date().toISOString() })
    .eq('tiebreaker_id', tiebreakerId);

  await adminClient
    .from('tiebreakers')
    .update(winner
      ? { status: 'resolved', resolved_by: 'event_nomination', winner_profile_id: winner }
      : { status: 'in_progress' })
    .eq('id', tiebreakerId);

  const href = `/competitions/${id}/leaderboard`;
  const notifyIds = winner
    ? tiedProfileIds
    : [...tiedProfileIds, competition.host_id, competition.cohost_id].filter((profileId): profileId is string => !!profileId);
  await createNotifications(
    adminClient,
    [...new Set(notifyIds)].map((profileId) => ({
      profileId,
      type: winner ? 'tiebreaker_resolved' : 'tiebreaker_host_decision',
      title: winner ? 'Tiebreaker settled' : 'Tiebreaker needs the host',
      body: winner
        ? `The nominated events settled your tie in ${competition.name}.`
        : `The nominated events could not separate the tie in ${competition.name}. The host will decide.`,
      data: { competition_id: id, href },
    })),
  );

  return NextResponse.json({
    data: { submitted: true, bothSubmitted: true, resolved: !!winner, winner_profile_id: winner },
    error: null,
  });
}
