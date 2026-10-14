/*
 * This file handles requests for the personal bests API route.
 */

// GET /api/users/[profileId]/personal-bests — fetch sorted personal bests for a profile
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getPersonalBests } from '@repo/supabase';

interface PersonalBestRow {
  events?: { name: string; event_categories: { name: string } | null } | null;
  [key: string]: unknown;
}

interface Params {
  params: Promise<{ profileId: string }>;
}

// Handles get.
export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await getPersonalBests(adminClient, (await params).profileId);
  if (error) return NextResponse.json({ data: null, error }, { status: 500 });

  const bests = (data ?? []) as PersonalBestRow[];

  // Client-side sort by category then event name — nested relation ordering is unreliable at runtime
  bests.sort((a, b) => {
    const catA = a.events?.event_categories?.name ?? '';
    const catB = b.events?.event_categories?.name ?? '';
    if (catA !== catB) return catA.localeCompare(catB);
    return (a.events?.name ?? '').localeCompare(b.events?.name ?? '');
  });

  return NextResponse.json({ data: bests, error: null });
}
