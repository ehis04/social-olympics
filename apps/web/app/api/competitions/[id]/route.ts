// GET /api/competitions/[id] — fetch a single competition by ID
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberWithProfile = Pick<
  Database['public']['Tables']['competition_members']['Row'],
  'profile_id'
>;

interface Params {
  params: { id: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await getCompetition(client, params.id);
  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = data as CompetitionRow;

  const isPublic = competition.is_public;
  const { data: memberData } = await getCompetitionMembers(client, params.id);
  const members = (memberData ?? []) as MemberWithProfile[];
  const isMember = members.some((m) => m.profile_id === user.id);

  if (!isPublic && !isMember) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.json({ data: competition, error: null });
}
