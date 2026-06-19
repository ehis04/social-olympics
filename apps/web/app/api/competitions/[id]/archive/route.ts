// POST /api/competitions/[id]/archive — move a complete competition to archived
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Params {
  params: { id: string };
}

export async function POST(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: compData } = await client
    .from('competitions')
    .select('host_id, status')
    .eq('id', params.id)
    .single();

  if (!compData) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const competition = compData as Pick<CompetitionRow, 'host_id' | 'status'>;

  if (competition.host_id !== user.id) {
    return NextResponse.json({ error: 'Only the host can archive a competition' }, { status: 403 });
  }

  if (competition.status !== 'complete') {
    return NextResponse.json(
      { error: 'Only complete competitions can be archived' },
      { status: 409 },
    );
  }

  const { data, error } = await client
    .from('competitions')
    .update({ status: 'archived' })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Failed to archive competition' }, { status: 500 });

  return NextResponse.json({ data });
}
