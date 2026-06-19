// POST /api/competitions/[id]/ghost-profile — host creates a ghost profile for a non-registered user
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { getCompetition, createGhostProfile } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await getCompetition(client, params.id);
  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const competition = compData as CompetitionRow;

  if (competition.host_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: { display_name?: string; country_code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body.display_name || body.display_name.trim().length < 2) {
    return NextResponse.json(
      { error: 'display_name must be at least 2 characters' },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();
  const { data, error } = await createGhostProfile(
    adminClient,
    body.display_name.trim(),
    params.id,
  );

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to create guest profile' }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
