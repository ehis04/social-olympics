/*
 * This file handles requests for the competition events API route.
 */

// GET /api/competitions/[id]/events — list the competition's events.
// POST — host or co-host adds a library or custom event to the competition.
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { addCompetitionEvent, createAdminClient, getCompetition, getCompetitionEvents } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface RouteParams {
  params: Promise<{ id: string }>;
}

const WEIGHT_TAG_MULTIPLIERS = {
  not_important: 0.5,
  standard: 1,
  important: 1.5,
  very_important: 2,
  custom: 1,
} as const;

const AddEventSchema = z.object({
  event_id: z.string().uuid(),
  weight_tag: z.enum(['not_important', 'standard', 'important', 'very_important', 'custom']).default('standard'),
  weight_multiplier: z.number().min(0.1).max(3).optional(),
});

// Handles get.
export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await getCompetitionEvents(client, id);
  if (error) return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

// Handles post.
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Only the host or co-host can add events' }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Events can no longer be added.' }, { status: 409 });
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = AddEventSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid event' }, { status: 400 });
  }
  const body = parsed.data;

  const { data: libraryEvent } = await adminClient
    .from('events')
    .select('id, is_active, is_custom, created_by')
    .eq('id', body.event_id)
    .maybeSingle();
  if (!libraryEvent || libraryEvent.is_active === false) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const { data: lastEvent } = await adminClient
    .from('competition_events')
    .select('sequence_order')
    .eq('competition_id', id)
    .order('sequence_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  const weightMultiplier = body.weight_tag === 'custom'
    ? body.weight_multiplier ?? 1
    : WEIGHT_TAG_MULTIPLIERS[body.weight_tag];

  const { data, error } = await addCompetitionEvent(adminClient, {
    competition_id: id,
    event_id: body.event_id,
    sequence_order: (lastEvent?.sequence_order ?? 0) + 1,
    weight_tag: body.weight_tag,
    weight_multiplier: weightMultiplier,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data }, { status: 201 });
}
