// GET /api/competitions/user — returns all competitions the current user is a member of
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getUserCompetitions } from '@repo/supabase';

export async function GET(req: NextRequest) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data, error } = await getUserCompetitions(client, user.id);
  if (error) return NextResponse.json({ error: 'Failed to fetch competitions' }, { status: 500 });

  return NextResponse.json({ data });
}
