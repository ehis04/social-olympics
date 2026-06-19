// POST /api/competitions/[id]/events/[eventId]/confirm — host confirms ranked results.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, confirmResult } from '@repo/supabase';
import { calculatePoints, getParticipationPoints } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: { id: string; eventId: string };
}

interface RankingEntry {
  resultId: string;
  place: number;
}

export async function POST(request: Request, { params }: RouteParams) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData, error: compError } = await getCompetition(client, params.id);
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
    .select('weight_multiplier, best_of, total_attempts')
    .eq('id', params.eventId)
    .single();

  const ev = eventData as {
    weight_multiplier: number;
    best_of: number | null;
    total_attempts: number | null;
  } | null;

  if (!ev) return NextResponse.json({ error: 'Event not found' }, { status: 404 });

  // Fetch points config for this competition
  const { data: pointsConfig } = await client
    .from('event_points_config')
    .select('finishing_place, points_value')
    .eq('competition_id', params.id)
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

      const { error } = await confirmResult(client, {
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
  await client
    .from('competition_events')
    .update({ status: 'confirmed' })
    .eq('id', params.eventId);

  return NextResponse.json({ data: { confirmed: body.rankings.length } });
}
