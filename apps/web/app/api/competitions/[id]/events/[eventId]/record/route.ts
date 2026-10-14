/*
 * This file handles requests for the record API route.
 */

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
import { loadPointsTable, scoreForPlace } from '@/lib/scoring/event-scoring';
import type { Database } from '@repo/types';
import { z } from 'zod';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

const RecordResultsSchema = z.object({ results: z.array(z.object({
  profileId: z.string().uuid(), value: z.number().finite().nonnegative().nullable(),
  notes: z.string().max(300).nullable().optional(), isDnf: z.boolean(),
})).min(1) });

// Handles post.
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
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }
  const isHostOrCohost = competition.host_id === user.id || competition.cohost_id === user.id;
  if (!isHostOrCohost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = RecordResultsSchema.safeParse(input);
  if (!parsed.success) return NextResponse.json({ error: 'Results must contain valid participant IDs and values' }, { status: 400 });
  const body = parsed.data;
  const participantIds = body.results.map((result) => result.profileId);
  if (new Set(participantIds).size !== participantIds.length) {
    return NextResponse.json({ error: 'Each participant may only appear once' }, { status: 400 });
  }
  const { data: participants, error: participantError } = await adminClient.from('competition_members')
    .select('profile_id').eq('competition_id', id).eq('status', 'active').in('profile_id', participantIds);
  if (participantError) return NextResponse.json({ error: 'Failed to validate participants' }, { status: 500 });
  if (participants?.length !== participantIds.length) return NextResponse.json({ error: 'Participants must be active members of this competition' }, { status: 400 });

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

  if (!['active', 'results_pending'].includes(ev.status)) {
    return NextResponse.json(
      { error: 'Start the event before recording results' },
      { status: 409 },
    );
  }

  const pointsTable = await loadPointsTable(adminClient, id);

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
        const { error: updateError } = await adminClient
          .from('results')
          .update({
            result_value_primary: entry.value,
            is_dnf: entry.isDnf,
            notes: entry.notes ?? null,
            submitted_by: user.id,
            submitted_at: new Date().toISOString(),
          })
          .eq('id', resultId);
        if (updateError) { errors.push(`${entry.profileId}: ${updateError.message}`); return; }
      } else {
        const { data: newResult, error: submitErr } = await submitResult(adminClient, {
          competition_event_id: eventId,
          profile_id: entry.profileId,
          submitted_by: user.id,
          result_value_primary: entry.value,
          is_dnf: entry.isDnf,
          ...(entry.notes ? { notes: entry.notes } : {}),
        });

        if (submitErr || !newResult) {
          errors.push(`${entry.profileId}: ${submitErr?.message ?? 'Failed to submit'}`);
          return;
        }

        resultId = (newResult as { id: string }).id;
      }

      const place = rankMap[entry.profileId] ?? null;
      const score = scoreForPlace(place, entry.isDnf, pointsTable);

      const { error: confirmErr } = await confirmResult(adminClient, {
        result_id: resultId,
        finishing_place: place,
        points_awarded: score.points_awarded,
        participation_points: score.participation_points,
        confirmed_by: user.id,
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

  // Submissions from people the host left out of this event are discarded so none stay pending.
  const recordedIds = resultsWithValues.map((entry) => entry.profileId);
  await adminClient
    .from('results')
    .delete()
    .eq('competition_event_id', eventId)
    .is('confirmed_at', null)
    .not('profile_id', 'in', `(${recordedIds.join(',')})`);

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
