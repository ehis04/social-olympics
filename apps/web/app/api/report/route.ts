// POST /api/report — submit a moderation report
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createReport } from '@repo/supabase';

type ReportTargetType = 'competition' | 'profile' | 'feed_item' | 'message';

interface RequestBody {
  target_type: ReportTargetType;
  target_id: string;
  competition_id?: string;
  reason: string;
}

const VALID_TARGET_TYPES: ReportTargetType[] = ['competition', 'profile', 'feed_item', 'message'];
const MAX_REASON_LENGTH = 500;

export async function POST(request: NextRequest) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  const { target_type, target_id, competition_id, reason } = body;

  if (!target_type || !VALID_TARGET_TYPES.includes(target_type)) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid target_type' } }, { status: 400 });
  }
  if (!target_id) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'target_id is required' } }, { status: 400 });
  }
  if (!reason || reason.trim().length === 0) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'reason is required' } }, { status: 400 });
  }
  if (reason.length > MAX_REASON_LENGTH) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: `reason must be ${MAX_REASON_LENGTH} characters or fewer` } }, { status: 400 });
  }

  // Prevent self-reporting
  if (target_type === 'profile' && target_id === user.id) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Cannot report yourself' } }, { status: 400 });
  }

  const { data, error } = await createReport(client, {
    reporter_profile_id: user.id,
    target_type,
    target_id,
    competition_id: competition_id ?? null,
    reason: reason.trim(),
    status: 'pending',
  });

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null }, { status: 201 });
}
