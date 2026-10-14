/*
 * This file handles requests for the confirm API route.
 */

// POST /api/competitions/[id]/events/[eventId]/confirm — host confirms ranked results.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition, confirmResult } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { loadPointsTable, scoreForPlace } from '@/lib/scoring/event-scoring';
import { z } from 'zod';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

const RankingsSchema = z.object({
  rankings: z.array(z.object({ resultId: z.string().uuid(), place: z.number().int().positive() })).min(1),
});

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = RankingsSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'rankings must contain valid result IDs and positive integer places' }, { status: 400 });
  }
  const body = parsed.data;
  const resultIds = body.rankings.map((ranking) => ranking.resultId);
  if (new Set(resultIds).size !== resultIds.length || body.rankings.some((ranking) => ranking.place > resultIds.length)) {
    return NextResponse.json({ error: 'Rankings contain duplicate results or invalid places' }, { status: 400 });
  }

  // Fetch event config for scoring
  const { data: eventData } = await client
    .from('competition_events')
    .select('events(name)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .single();

  const ev = eventData as {
    events: { name: string } | null;
  } | null;

  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Validate the complete batch before using the admin client to mutate results.
  const { data: eventResults, error: resultsError } = await adminClient
    .from('results')
    .select('id, is_dnf, is_disqualified')
    .eq('competition_event_id', eventId)
    .in('id', resultIds);
  if (resultsError) return NextResponse.json({ error: 'Failed to validate results' }, { status: 500 });
  if (eventResults?.length !== resultIds.length) {
    return NextResponse.json({ error: 'Every result must belong to this event' }, { status: 400 });
  }

  const pointsTable = await loadPointsTable(adminClient, id);

  // Confirm each result with calculated points
  const confirmErrors: string[] = [];
  await Promise.all(
    body.rankings.map(async ({ resultId, place }) => {
      const result = eventResults.find((entry) => entry.id === resultId)!;
      const ineligible = result.is_dnf || result.is_disqualified;
      const score = scoreForPlace(ineligible ? null : place, ineligible, pointsTable);

      const { error } = await confirmResult(adminClient, {
        result_id: resultId,
        finishing_place: ineligible ? null : place,
        points_awarded: score.points_awarded,
        participation_points: score.participation_points,
        confirmed_by: user.id,
      });

      if (error) confirmErrors.push(`${resultId}: ${error.message}`);
    }),
  );

  if (confirmErrors.length > 0) {
    return NextResponse.json({ error: 'Some results failed to confirm', details: confirmErrors }, { status: 500 });
  }

  // Move event to confirmed
  const { error: updateError } = await adminClient
    .from('competition_events')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', eventId);
  if (updateError) return NextResponse.json({ error: 'Failed to update event status' }, { status: 500 });

  const { data: members } = await adminClient
    .from('competition_members')
    .select('profile_id')
    .eq('competition_id', id)
    .eq('status', 'active');

  await createNotifications(
    adminClient,
    (members ?? []).map((member) => ({
      profileId: member.profile_id,
      type: 'event_results_confirmed',
      title: 'Results confirmed',
      body: `${ev.events?.name ?? 'Event'} results have been confirmed.`,
      data: {
        competition_id: id,
        competition_event_id: eventId,
        href: `/competitions/${id}/events/${eventId}`,
      },
    })),
  );

  return NextResponse.json({ data: { confirmed: body.rankings.length } });
}
