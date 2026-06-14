// POST /api/competitions/[id]/complete — host completes the competition and triggers podium generation
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getCompetition, completeCompetition } from '@repo/supabase';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: Params) {
  const client = getServerClient();
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

  if (competition.status !== 'active') {
    return NextResponse.json(
      { error: 'Competition must be active to complete' },
      { status: 400 },
    );
  }

  const adminClient = createAdminClient();
  const { error } = await completeCompetition(adminClient, params.id);
  if (error) {
    return NextResponse.json({ error: 'Failed to complete competition' }, { status: 500 });
  }

  // Trigger podium generation edge function
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/generate-podium`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ competition_id: params.id }),
      },
    );
  } catch {
    // Non-fatal — podium can be regenerated manually
  }

  return NextResponse.json({ data: { status: 'complete' } });
}
