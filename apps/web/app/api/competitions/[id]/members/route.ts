// GET and POST /api/competitions/[id]/members — list members or add a member
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers, addMember } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRole = Database['public']['Enums']['member_role'];

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Verify caller is a member
  const { data: member } = await client
    .from('competition_members')
    .select('id')
    .eq('competition_id', (await params).id)
    .eq('profile_id', user.id)
    .single();
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await getCompetitionMembers(client, (await params).id);
  if (error) return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 });

  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await getCompetition(client, (await params).id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  let body: { profile_id?: string; role?: MemberRole } = {};
  try {
    body = await req.json();
  } catch {
    // Empty body is valid for self-join
  }

  const isHostOrCohost =
    competition.host_id === user.id || competition.cohost_id === user.id;

  if (body.profile_id && body.profile_id !== user.id) {
    // Host invite
    if (!isHostOrCohost) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const role: MemberRole = body.role ?? 'competitor';
    const { error } = await addMember(client, (await params).id, body.profile_id, role);
    if (error) return NextResponse.json({ error: 'Failed to add member' }, { status: 500 });
    return NextResponse.json({ data: { success: true } }, { status: 201 });
  }

  // Self-join — must be public
  if (!competition.is_public) {
    return NextResponse.json(
      { error: 'This competition is private. Use an invite code to join.' },
      { status: 403 },
    );
  }

  // Check not already a member
  const { data: existing } = await client
    .from('competition_members')
    .select('id, status')
    .eq('competition_id', (await params).id)
    .eq('profile_id', user.id)
    .single();

  if (existing) {
    if (existing.status === 'withdrawn') {
      // Re-activate
      await client
        .from('competition_members')
        .update({ status: 'active' })
        .eq('id', existing.id);
      return NextResponse.json({ data: { success: true } }, { status: 200 });
    }
    return NextResponse.json({ error: 'Already a member' }, { status: 409 });
  }

  const { error } = await addMember(client, (await params).id, user.id, 'competitor');
  if (error) return NextResponse.json({ error: 'Failed to join competition' }, { status: 500 });

  return NextResponse.json({ data: { success: true } }, { status: 201 });
}
