// GET /api/competitions — public discovery. POST — create a competition.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { addCompetitionEvent, addMember, createAdminClient, createCompetition, createGhostProfile, getPublicCompetitions } from '@repo/supabase';
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
  // Members to add directly (follows + ghost profiles)
  followProfileIds: z.array(z.string().uuid()).default([]),
  ghostMembers: z.array(z.object({ tempId: z.string(), displayName: z.string().min(2).max(30) })).default([]),
  // eventLibraryId → array of tempIds or profileIds
  eventAssignments: z.record(z.array(z.string())).default({}),
});

const WEIGHT_TAG_MULTIPLIERS: Record<WeightTag, number> = {
  not_important: 0.5,
  standard: 1,
  important: 1.5,
  very_important: 2,
  custom: 1,
};

export async function GET(request: NextRequest) {
  const client = await getServerClient();
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
  const client = await getServerClient();
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
  const adminClient = createAdminClient();
  const { data: competitionData, error: competitionError } = await createCompetition(adminClient, {
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
  // Add host as member
  const memberResult = await addMember(adminClient, competition.id, user.id, 'competitor');
  if (memberResult.error) {
    return NextResponse.json({ error: 'Competition created, but failed to add host as member' }, { status: 500 });
  }

  // Add directly-specified follow members (best-effort — don't fail the whole request on one bad ID)
  await Promise.all(
    input.followProfileIds.map((profileId) =>
      addMember(adminClient, competition.id, profileId, 'competitor').catch(() => null),
    ),
  );

  // Create ghost profiles and collect tempId → realProfileId map
  const tempIdToProfileId: Record<string, string> = {};
  const createdGhostAuthIds: string[] = [];
  for (const profileId of input.followProfileIds) {
    tempIdToProfileId[`follow:${profileId}`] = profileId;
  }
  tempIdToProfileId[`host`] = user.id;

  await Promise.all(
    input.ghostMembers.map(async ({ tempId, displayName }) => {
      const { data } = await createGhostProfile(adminClient, displayName, competition.id);
      if (data) {
        const d = data as { profile: { id: string } };
        tempIdToProfileId[tempId] = d.profile.id;
        createdGhostAuthIds.push(d.profile.id);
      }
    }),
  );

  // Create competition events and build eventLibraryId → competitionEventId map
  const eventIdMap: Record<string, string> = {};
  const eventErrors: string[] = [];
  await Promise.all(
    input.selectedEventIds.map(async (eventId, index) => {
      const weight = input.eventWeights[eventId];
      const weightTag = isWeightTag(weight?.weight_tag) ? weight.weight_tag : 'standard';
      const weightMultiplier =
        weightTag === 'custom'
          ? (weight?.weight_multiplier ?? WEIGHT_TAG_MULTIPLIERS.standard)
          : WEIGHT_TAG_MULTIPLIERS[weightTag];

      const { data: evData, error } = await addCompetitionEvent(adminClient, {
        competition_id: competition.id,
        event_id: eventId,
        sequence_order: index + 1,
        weight_tag: weightTag,
        weight_multiplier: weightMultiplier,
      });

      if (error) {
        eventErrors.push(`${eventId}: ${error.message}`);
      } else if (evData) {
        eventIdMap[eventId] = (evData as { id: string }).id;
      }
    }),
  );

  if (eventErrors.length > 0) {
    // Clean up ghost auth users so they don't become orphaned
    await Promise.all(
      createdGhostAuthIds.map((id) => adminClient.auth.admin.deleteUser(id).catch(() => null)),
    );
    return NextResponse.json(
      { error: 'Competition created, but some events failed to add', details: eventErrors },
      { status: 500 },
    );
  }

  // Store event participant assignments
  const participantRows: { competition_event_id: string; profile_id: string; assigned_by: string }[] = [];
  for (const [eventLibraryId, tempIds] of Object.entries(input.eventAssignments)) {
    const compEventId = eventIdMap[eventLibraryId];
    if (!compEventId) continue;
    for (const tempId of tempIds) {
      const realProfileId = tempIdToProfileId[tempId];
      if (realProfileId) {
        participantRows.push({ competition_event_id: compEventId, profile_id: realProfileId, assigned_by: user.id });
      }
    }
  }

  if (participantRows.length > 0) {
    const { error: assignError } = await adminClient
      .from('competition_event_participants')
      .insert(participantRows);
    if (assignError) {
      return NextResponse.json(
        { error: 'Competition created but participant assignments failed', details: assignError.message },
        { status: 500 },
      );
    }
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
