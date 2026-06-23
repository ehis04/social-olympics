// POST /api/competitions/[id]/events/[eventId]/confirm — host confirms ranked results.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition, confirmResult } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { calculatePoints, getParticipationPoints } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

interface RankingEntry {
  resultId: string;
  place: number;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: { rankings?: RankingEntry[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(body.rankings) || body.rankings.length === 0) {
    return NextResponse.json({ error: 'rankings must be a non-empty array' }, { status: 400 });
  }

  // Fetch event config for scoring
  const { data: eventData } = await client
    .from('competition_events')
    .select('weight_multiplier, best_of, total_attempts, events(name)')
    .eq('id', eventId)
    .single();

  const ev = eventData as {
    weight_multiplier: number;
    best_of: number | null;
    total_attempts: number | null;
    events: { name: string } | null;
  } | null;

  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Fetch points config for this competition
  const { data: pointsConfig } = await client
    .from('event_points_config')
    .select('finishing_place, points_value')
    .eq('competition_id', id)
    .order('finishing_place', { ascending: true });

  const placesPoints = (pointsConfig ?? []) as Array<{
    finishing_place: number;
    points_value: number;
  }>;

  const totalParticipants = body.rankings.length;
  const weightMultiplier = ev.weight_multiplier ?? 1;

  // Confirm each result with calculated points
  const confirmErrors: string[] = [];
  await Promise.all(
    body.rankings.map(async ({ resultId, place }) => {
      const configuredPoints = placesPoints.find((p) => p.finishing_place === place)?.points_value;
      const pointsAwarded =
        configuredPoints !== undefined
          ? configuredPoints * weightMultiplier
          : calculatePoints(place, weightMultiplier);
      const participationPoints = getParticipationPoints(false);

      const { error } = await confirmResult(adminClient, {
        result_id: resultId,
        finishing_place: place,
        points_awarded: pointsAwarded,
        participation_points: participationPoints,
      });

      if (error) confirmErrors.push(`${resultId}: ${error.message}`);
    }),
  );

  if (confirmErrors.length > 0) {
    return NextResponse.json({ error: 'Some results failed to confirm', details: confirmErrors }, { status: 500 });
  }

  // Move event to confirmed
  await adminClient
    .from('competition_events')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', eventId);

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
