// GET /api/competitions — public discovery. POST — create a competition.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { addCompetitionEvent, addMember, createCompetition, getPublicCompetitions } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type WeightTag = Database['public']['Enums']['weight_tag'];

const CreateCompetitionRequestSchema = z.object({
  name: z.string().min(3).max(60),
  description: z.string().max(500).nullable().optional(),
  is_public: z.boolean(),
  country_code: z.string().length(2).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  prize_pot_per_person: z.number().positive().nullable().optional(),
  min_events_required: z.number().int().positive(),
  mvp_voting_enabled: z.boolean().default(true),
  worst_performer_enabled: z.boolean().default(true),
  selectedEventIds: z.array(z.string().uuid()).min(1),
  eventWeights: z.record(
    z.object({
      weight_tag: z.string(),
      weight_multiplier: z.number().positive(),
    }),
  ).default({}),
  inviteEmails: z.array(z.string().email()).default([]),
});

const WEIGHT_TAG_MULTIPLIERS: Record<WeightTag, number> = {
  not_important: 0.5,
  standard: 1,
  important: 1.5,
  very_important: 2,
  custom: 1,
};

export async function GET(request: NextRequest) {
  const client = getServerClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
  const cursor = searchParams.get('cursor') ?? undefined;
  const q = searchParams.get('q') ?? undefined;
  const countryCode = searchParams.get('country_code') ?? undefined;
  const city = searchParams.get('city') ?? undefined;

  const result = await getPublicCompetitions(client, {
    limit,
    ...(cursor ? { cursor } : {}),
    ...(q ? { q } : {}),
    ...(countryCode ? { country_code: countryCode } : {}),
    ...(city ? { city } : {}),
  });

  if (result.error) {
    return NextResponse.json({ error: 'Failed to fetch competitions' }, { status: 500 });
  }

  return NextResponse.json({
    data: result.data ?? [],
    error: null,
    hasMore: result.hasMore,
    nextCursor: result.nextCursor,
  });
}

export async function POST(request: NextRequest) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CreateCompetitionRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid competition data' },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data: competitionData, error: competitionError } = await createCompetition(client, {
    name: input.name,
    host_id: user.id,
    is_public: input.is_public,
    min_events_required: input.min_events_required,
    mvp_voting_enabled: input.mvp_voting_enabled,
    worst_performer_enabled: input.worst_performer_enabled,
    total_events: input.selectedEventIds.length,
    ...(input.description ? { description: input.description } : {}),
    ...(input.country_code ? { country_code: input.country_code } : {}),
    ...(input.city ? { city: input.city } : {}),
    ...(input.prize_pot_per_person ? { prize_pot_per_person: input.prize_pot_per_person } : {}),
  });

  if (competitionError || !competitionData) {
    return NextResponse.json(
      { error: competitionError?.message ?? 'Failed to create competition' },
      { status: 500 },
    );
  }

  const competition = competitionData as CompetitionRow;
  const memberResult = await addMember(client, competition.id, user.id, 'competitor');
  if (memberResult.error) {
    return NextResponse.json({ error: 'Competition created, but failed to add host as member' }, { status: 500 });
  }

  const eventErrors: string[] = [];
  await Promise.all(
    input.selectedEventIds.map(async (eventId, index) => {
      const weight = input.eventWeights[eventId];
      const weightTag = isWeightTag(weight?.weight_tag) ? weight.weight_tag : 'standard';
      const weightMultiplier =
        weightTag === 'custom'
          ? (weight?.weight_multiplier ?? WEIGHT_TAG_MULTIPLIERS.standard)
          : WEIGHT_TAG_MULTIPLIERS[weightTag];

      const { error } = await addCompetitionEvent(client, {
        competition_id: competition.id,
        event_id: eventId,
        sequence_order: index + 1,
        weight_tag: weightTag,
        weight_multiplier: weightMultiplier,
      });

      if (error) eventErrors.push(`${eventId}: ${error.message}`);
    }),
  );

  if (eventErrors.length > 0) {
    return NextResponse.json(
      { error: 'Competition created, but some events failed to add', details: eventErrors },
      { status: 500 },
    );
  }

  return NextResponse.json({ data: competition, error: null }, { status: 201 });
}

function isWeightTag(value: unknown): value is WeightTag {
  return (
    value === 'not_important' ||
    value === 'standard' ||
    value === 'important' ||
    value === 'very_important' ||
    value === 'custom'
  );
}
