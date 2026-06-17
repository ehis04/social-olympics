// GET /api/competitions/[id]/events/[eventId]/vote-results — fetch tallied vote results
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';

interface Params {
  params: { id: string; eventId: string };
}

interface VoteResultRow {
  vote_type: string;
  winner_profile_id: string;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
  } | null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data, error } = await client
    .from('performance_vote_results')
    .select('vote_type, winner_profile_id, profiles!performance_vote_results_winner_profile_id_fkey(id, display_name, avatar_url)')
    .eq('competition_event_id', params.eventId);

  if (error) return NextResponse.json({ data: null, error: { code: error.code, message: error.message } }, { status: 500 });

  const rows = (data ?? []) as VoteResultRow[];
  const mvpRow = rows.find((r) => r.vote_type === 'mvp');
  const worstRow = rows.find((r) => r.vote_type === 'worst_performer');

  return NextResponse.json({
    data: {
      mvp: mvpRow?.profiles ?? null,
      worst_performer: worstRow?.profiles ?? null,
    },
    error: null,
  });
}
