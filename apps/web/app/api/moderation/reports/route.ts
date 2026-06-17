// GET /api/moderation/reports — admin only: fetch paginated moderation reports
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getReports } from '@repo/supabase';

const ADMIN_PROFILE_IDS = (process.env.ADMIN_PROFILE_IDS ?? '').split(',').filter(Boolean);

export async function GET(request: NextRequest) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  if (!ADMIN_PROFILE_IDS.includes(user.id)) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending';
  const limit = Math.min(Number(searchParams.get('limit') ?? '20'), 50);
  const cursor = searchParams.get('cursor') ?? undefined;

  const adminClient = createAdminClient();
  const pagination = cursor ? { limit, cursor } : { limit };
  const { data, error, hasMore, nextCursor } = await getReports(adminClient, status, pagination);

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null, hasMore, nextCursor });
}
