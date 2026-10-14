/*
 * This file handles requests for the team results API route.
 */

// POST /api/competitions/[id]/events/[eventId]/team-results — host records one score per team.
// Every team member receives the team's result and place, and the event is confirmed.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition } from '@repo/supabase';
import { createNotifications } from '@/lib/notifications/create-notification';
import { rerankEvent } from '@/lib/scoring/event-scoring';
import { POOL_TEAM_NAME } from '@/lib/teams/team-event';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>;
}

const TeamResultsSchema = z.object({
  results: z.array(z.object({
    team_id: z.string().uuid(),
    value: z.number().finite().nonnegative().nullable(),
    is_dnf: z.boolean().default(false),
  })).min(2, 'Enter results for at least two teams'),
});

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { id, eventId } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
  const competition = compData as CompetitionRow;
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Results and events are locked.' }, { status: 409 });
  }
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Only the host or co-host can record team results' }, { status: 403 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const parsed = TeamResultsSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid team results' }, { status: 400 });
  }
  const entries = parsed.data.results;
  if (entries.some((entry) => !entry.is_dnf && entry.value === null)) {
    return NextResponse.json({ error: 'Enter a result for every team, or mark it as DNF' }, { status: 400 });
  }

  const { data: event } = await adminClient
    .from('competition_events')
    .select('id, status, name_override, events(name, is_team_event)')
    .eq('id', eventId)
    .eq('competition_id', id)
    .maybeSingle();
  if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  const library = event.events as unknown as { name: string; is_team_event: boolean } | null;
  if (!library?.is_team_event) return NextResponse.json({ error: 'This is not a team event' }, { status: 400 });
  if (!['active', 'results_pending'].includes(event.status)) {
    return NextResponse.json({ error: 'Start the event before recording results' }, { status: 409 });
  }

  const { data: teams } = await adminClient
    .from('teams')
    .select('id, name, team_members(profile_id)')
    .eq('competition_event_id', eventId)
    .neq('name', POOL_TEAM_NAME);
  const teamRows = (teams ?? []) as unknown as { id: string; name: string; team_members: { profile_id: string }[] }[];
  if (teamRows.length < 2) return NextResponse.json({ error: 'Assign teams before recording results' }, { status: 409 });

  const teamIds = new Set(teamRows.map((team) => team.id));
  if (entries.length !== teamRows.length || entries.some((entry) => !teamIds.has(entry.team_id))) {
    return NextResponse.json({ error: 'Enter a result for every team in this event' }, { status: 400 });
  }

  const { data: existingRows } = await adminClient
    .from('results')
    .select('id, profile_id')
    .eq('competition_event_id', eventId);
  const existingByProfile = new Map((existingRows ?? []).map((row) => [row.profile_id as string, row.id as string]));

  for (const entry of entries) {
    const team = teamRows.find((row) => row.id === entry.team_id)!;
    for (const member of team.team_members) {
      const values = {
        team_id: team.id,
        result_value_primary: entry.is_dnf ? null : entry.value,
        is_dnf: entry.is_dnf,
        submitted_by: user.id,
        submitted_at: new Date().toISOString(),
      };
      const existingId = existingByProfile.get(member.profile_id);
      const { error } = existingId
        ? await adminClient.from('results').update(values).eq('id', existingId)
        : await adminClient.from('results').insert({
          ...values,
          competition_event_id: eventId,
          profile_id: member.profile_id,
        });
      if (error) return NextResponse.json({ error: 'Failed to save team results' }, { status: 500 });
    }
  }

  const { error: rankError } = await rerankEvent(adminClient, id, eventId, user.id);
  if (rankError) return NextResponse.json({ error: rankError }, { status: 500 });

  const now = Date.now();
  await adminClient
    .from('competition_events')
    .update({
      status: 'confirmed',
      confirmed_at: new Date(now).toISOString(),
      dispute_window_closes_at: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', eventId);

  const eventName = event.name_override ?? library.name ?? 'Event';
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
      body: `${eventName} results have been confirmed.`,
      data: {
        competition_id: id,
        competition_event_id: eventId,
        href: `/competitions/${id}/events/${eventId}`,
      },
    })),
  );

  return NextResponse.json({ data: { confirmed: true } });
}
