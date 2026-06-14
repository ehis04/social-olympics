// POST /api/competitions/join — join a competition using an 8-character invite code
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetitionByInviteCode, addMember } from '@repo/supabase';
import { JoinByCodeSchema } from '@repo/validations';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

export async function POST(req: NextRequest) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = JoinByCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid invite code' },
      { status: 400 },
    );
  }

  const { data: compData } = await getCompetitionByInviteCode(client, parsed.data.invite_code);
  if (!compData) {
    return NextResponse.json(
      { error: 'Invalid invite code. Please check and try again.' },
      { status: 404 },
    );
  }

  const competition = compData as CompetitionRow;

  if (competition.status === 'archived') {
    return NextResponse.json({ error: 'This competition has been archived.' }, { status: 400 });
  }

  // Check not already a member
  const { data: existing } = await client
    .from('competition_members')
    .select('id, status')
    .eq('competition_id', competition.id)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    if (existing.status === 'withdrawn') {
      await client
        .from('competition_members')
        .update({ status: 'active' })
        .eq('id', existing.id);
      return NextResponse.json({ data: { competitionId: competition.id } });
    }
    return NextResponse.json(
      { error: 'You are already a member of this competition.' },
      { status: 409 },
    );
  }

  const { error } = await addMember(client, competition.id, user.id, 'competitor');
  if (error) {
    return NextResponse.json({ error: 'Failed to join competition' }, { status: 500 });
  }

  return NextResponse.json({ data: { competitionId: competition.id } }, { status: 201 });
}
