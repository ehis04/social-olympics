// GET /api/users/[profileId] — fetch a single profile with career stats
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getProfile } from '@repo/supabase';
import type { ProfileWithStats } from '@repo/types';

interface Params {
  params: Promise<{ profileId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  const adminClient = createAdminClient();
  const { data, error } = await getProfile(adminClient, (await params).profileId);
  if (error || !data) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Profile not found' } }, { status: 404 });

  const profile = data as ProfileWithStats;
  return NextResponse.json({ data: profile, error: null });
}
