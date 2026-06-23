// GET/PATCH /api/competitions/[id] — fetch or update a single competition
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers, updateCompetition, updateCompetitionEvent } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberWithProfile = Pick<
  Database['public']['Tables']['competition_members']['Row'],
  'profile_id'
>;

interface Params {
  params: Promise<{ id: string }>;
}

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

export async function PATCH(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await getCompetition(client, (await params).id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = compData as CompetitionRow;
  if (competition.host_id !== user.id && competition.cohost_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
  const filteredFields = Object.fromEntries(
    Object.entries(competitionFields).filter(([k]) => allowedFields.includes(k)),
  );

  if (Object.keys(filteredFields).length > 0) {
    const { error } = await updateCompetition(client, (await params).id, filteredFields);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (eventWeights && typeof eventWeights === 'object') {
    for (const [ceId, weights] of Object.entries(eventWeights)) {
      const { error } = await updateCompetitionEvent(client, ceId, {
        weight_tag: weights.weight_tag,
        weight_multiplier: weights.weight_multiplier,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ data: { success: true } });
}
