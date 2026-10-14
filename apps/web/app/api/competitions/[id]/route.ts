/*
 * This file handles requests for the id API route.
 */

// GET/PATCH /api/competitions/[id] — fetch or update a single competition
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition, getCompetitionMembers, updateCompetition, updateCompetitionEvent } from '@repo/supabase';
import { BLOCKED_CONTENT_MESSAGE, containsBlockedKeyword } from '@/lib/moderation/blocked-content';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberWithProfile = Pick<
  Database['public']['Tables']['competition_members']['Row'],
  'profile_id'
>;

interface Params {
  params: Promise<{ id: string }>;
}

// Handles get.
export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await getCompetition(client, (await params).id);
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = data as CompetitionRow;

  const isPublic = competition.is_public;
  const { data: memberData } = await getCompetitionMembers(client, (await params).id);
  const members = (memberData ?? []) as MemberWithProfile[];
  const isMember = members.some((m) => m.profile_id === user.id);

  if (!isPublic && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: competition, error: null });
}

// Handles patch.
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: compData } = await getCompetition(adminClient, id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  const isHost = competition.host_id === user.id;
  if (!isHost && competition.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (['complete', 'archived'].includes(competition.status)) {
    return NextResponse.json({ error: 'This competition is finished. Settings are locked.' }, { status: 409 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { eventWeights, ...competitionFields } = body as {
    eventWeights?: Record<string, { weight_tag: string; weight_multiplier: number }>;
    [key: string]: unknown;
  };

  const allowedFields = [
    'name', 'description', 'is_public', 'country_code', 'city',
    'prize_pot_per_person', 'cohost_id', 'mvp_voting_enabled', 'worst_performer_enabled',
  ];
  const filteredFields: Record<string, unknown> = Object.fromEntries(
    Object.entries(competitionFields).filter(([k]) => allowedFields.includes(k)),
  );

  // Only fields whose value actually changes are checked against the locks below.
  const changed = (key: keyof CompetitionRow) =>
    key in filteredFields && filteredFields[key] !== competition[key];

  if (changed('cohost_id')) {
    if (!isHost) return NextResponse.json({ error: 'Only the host can change the co-host' }, { status: 403 });
    const cohostId = filteredFields.cohost_id;
    if (cohostId !== null) {
      if (typeof cohostId !== 'string' || cohostId === competition.host_id) {
        return NextResponse.json({ error: 'Choose another member as co-host' }, { status: 400 });
      }
      const { data: cohostMember } = await adminClient
        .from('competition_members')
        .select('id')
        .eq('competition_id', id)
        .eq('profile_id', cohostId)
        .eq('status', 'active')
        .maybeSingle();
      if (!cohostMember) return NextResponse.json({ error: 'The co-host must be an active member' }, { status: 400 });
    }
  } else {
    delete filteredFields.cohost_id;
  }

  if (competition.voting_locked && (changed('mvp_voting_enabled') || changed('worst_performer_enabled'))) {
    return NextResponse.json({ error: 'Voting settings are locked once the first event has started' }, { status: 409 });
  }

  if ('name' in filteredFields) {
    const name = typeof filteredFields.name === 'string' ? filteredFields.name.trim() : '';
    if (name.length < 3 || name.length > 60) {
      return NextResponse.json({ error: 'Competition name must be between 3 and 60 characters' }, { status: 400 });
    }
    filteredFields.name = name;
  }
  if ('description' in filteredFields && typeof filteredFields.description === 'string' && filteredFields.description.length > 500) {
    return NextResponse.json({ error: 'Description must be 500 characters or fewer' }, { status: 400 });
  }
  if (
    containsBlockedKeyword(filteredFields.name as string | undefined) ||
    containsBlockedKeyword(filteredFields.description as string | undefined)
  ) {
    return NextResponse.json({ error: BLOCKED_CONTENT_MESSAGE }, { status: 422 });
  }
  if (
    'prize_pot_per_person' in filteredFields &&
    filteredFields.prize_pot_per_person !== null &&
    (typeof filteredFields.prize_pot_per_person !== 'number' || filteredFields.prize_pot_per_person < 0)
  ) {
    return NextResponse.json({ error: 'Prize pot must be zero or more' }, { status: 400 });
  }

  if (Object.keys(filteredFields).length > 0) {
    const { error } = await updateCompetition(adminClient, id, filteredFields);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (eventWeights && typeof eventWeights === 'object') {
    const { data: ownEvents } = await adminClient
      .from('competition_events')
      .select('id, weight_tag, weight_multiplier')
      .eq('competition_id', id);
    const eventsById = new Map((ownEvents ?? []).map((event) => [event.id, event]));

    for (const [ceId, weights] of Object.entries(eventWeights)) {
      const current = eventsById.get(ceId);
      if (!current) return NextResponse.json({ error: 'Event not found in this competition' }, { status: 400 });
      if (current.weight_tag === weights.weight_tag && Number(current.weight_multiplier) === weights.weight_multiplier) continue;
      if (!WEIGHT_TAGS.includes(weights.weight_tag) || !(weights.weight_multiplier >= 0.1 && weights.weight_multiplier <= 3)) {
        return NextResponse.json({ error: 'Event weights must be between 0.1 and 3' }, { status: 400 });
      }
      const { error } = await updateCompetitionEvent(adminClient, ceId, {
        weight_tag: weights.weight_tag,
        weight_multiplier: weights.weight_multiplier,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data: { success: true } });
}

const WEIGHT_TAGS = ['not_important', 'standard', 'important', 'very_important', 'custom'];
