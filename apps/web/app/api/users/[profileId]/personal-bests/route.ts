// GET /api/users/[profileId]/personal-bests — fetch sorted personal bests for a profile
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { getPersonalBests } from '@repo/supabase';

interface PersonalBestRow {
  category_name?: string | null;
  event_name?: string | null;
  [key: string]: unknown;
}

interface Params {
  params: { profileId: string };
}

export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const { data, error } = await getPersonalBests(client, params.profileId);
  if (error) return NextResponse.json({ data: null, error }, { status: 500 });

  const bests = (data ?? []) as PersonalBestRow[];

  // Client-side sort by category then event name — nested relation ordering is unreliable at runtime
  bests.sort((a, b) => {
    const catA = a.category_name ?? '';
    const catB = b.category_name ?? '';
    if (catA !== catB) return catA.localeCompare(catB);
    return (a.event_name ?? '').localeCompare(b.event_name ?? '');
  });

  return NextResponse.json({ data: bests, error: null });
}
