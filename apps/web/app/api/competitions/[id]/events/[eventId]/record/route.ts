// POST /api/competitions/[id]/events/[eventId]/record — host submits and confirms all participant results in one go.
import { NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import {
  createAdminClient,
  getCompetition,
  submitResult,
  confirmResult,
} from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { calculatePoints, getParticipationPoints } from '@repo/scoring';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

interface ResultPayload {
  profileId: string;
  value: number | null;
  notes: string | null;
  isDnf: boolean;
}

export async function POST(request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData, error: compError } = await getCompetition(adminClient, id);
  if (compError || !compData) {
    return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
  }

  const competition = compData as CompetitionRow;
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { results?: ResultPayload[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!Array.isArray(body.results) || body.results.length === 0) {
    return NextResponse.json({ error: 'results must be a non-empty array' }, { status: 400 });
  }

  const { data: eventData } = await adminClient
    .from('competition_events')
    .select('status, weight_multiplier, events(name, result_type)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .single();

  if (!eventData) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const ev = eventData as {
    status: string;
    weight_multiplier: number;
    events: { name: string; result_type: string } | null;
  };

  if (ev.status !== 'active') {
    return NextResponse.json(
      { error: 'Event must be active to record results' },
      { status: 409 },
    );
  }

  const { data: pointsConfig } = await adminClient
    .from('event_points_config')
    .select('finishing_place, points_value')
    .eq('competition_id', id)
    .order('finishing_place', { ascending: true });

  const placesPoints = (pointsConfig ?? []) as Array<{
    finishing_place: number;
    points_value: number;
  }>;

  const weightMultiplier = ev.weight_multiplier ?? 1;
  const resultType = ev.events?.result_type ?? 'score';
  const lowerIsBetter = resultType === 'time' || resultType === 'inverted_score';

  const resultsWithValues = body.results.filter(
    (r) => r.isDnf || r.value !== null,
  );

  const ranked = [...resultsWithValues]
    .filter((r) => !r.isDnf && r.value !== null)
    .sort((a, b) =>
      lowerIsBetter
        ? (a.value ?? 0) - (b.value ?? 0)
        : (b.value ?? 0) - (a.value ?? 0),
    );

  const rankMap: Record<string, number | null> = {};
  for (const r of resultsWithValues) {
    rankMap[r.profileId] = null;
  }
  let rank = 1;
  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i]!.value !== ranked[i - 1]!.value) rank = i + 1;
    rankMap[ranked[i]!.profileId] = rank;
  }

  const errors: string[] = [];

  await Promise.all(
    resultsWithValues.map(async (entry) => {
      const { data: existingResult } = await adminClient
        .from('results')
        .select('id')
        .eq('competition_event_id', eventId)
        .eq('profile_id', entry.profileId)
        .single();

      let resultId: string;

      if (existingResult) {
        resultId = (existingResult as { id: string }).id;
        await adminClient
          .from('results')
          .update({
            result_value_primary: entry.value,
            notes: entry.notes ?? null,
            submitted_by: user.id,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', resultId);
      } else {
        const { data: newResult, error: submitErr } = await submitResult(adminClient, {
          competition_event_id: eventId,
          profile_id: entry.profileId,
          submitted_by: user.id,
          result_value_primary: entry.value,
          ...(entry.notes ? { notes: entry.notes } : {}),
        });

        if (submitErr || !newResult) {
          errors.push(`${entry.profileId}: ${submitErr?.message ?? 'Failed to submit'}`);
          return;
        }

        resultId = (newResult as { id: string }).id;
      }

      const place = rankMap[entry.profileId] ?? null;
      const configuredPoints = place !== null
        ? placesPoints.find((p) => p.finishing_place === place)?.points_value
        : undefined;
      const pointsAwarded =
        entry.isDnf
          ? 0
          : configuredPoints !== undefined
            ? configuredPoints * weightMultiplier
            : place !== null
              ? calculatePoints(place, weightMultiplier)
              : 0;

      // Participation points only for non-DNF players who earned no placement points
      const participationPoints = (!entry.isDnf && pointsAwarded === 0)
        ? getParticipationPoints(false)
        : 0;

      const { error: confirmErr } = await confirmResult(adminClient, {
        result_id: resultId,
        finishing_place: place,
        points_awarded: pointsAwarded,
        participation_points: participationPoints,
      });

      if (confirmErr) {
        errors.push(`${entry.profileId}: ${confirmErr.message}`);
      }
    }),
  );

  if (errors.length > 0) {
    return NextResponse.json(
      { error: 'Some results failed to record', details: errors },
      { status: 500 },
    );
  }

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

  return NextResponse.json({ data: { recorded: resultsWithValues.length } });
}
