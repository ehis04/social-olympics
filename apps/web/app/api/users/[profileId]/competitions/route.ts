// GET /api/users/[profileId]/competitions — fetch competition history for a profile
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getUserCompetitions } from '@repo/supabase';
import type { CompetitionSummary } from '@repo/types';

interface Params {
  params: Promise<{ profileId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await getUserCompetitions(adminClient, (await params).profileId);
  if (error) return NextResponse.json({ data: null, error }, { status: 500 });

  const competitions = (data ?? []) as CompetitionSummary[];
  return NextResponse.json({ data: competitions, error: null });
}
