// POST /api/report — submit a moderation report for review.
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';
import { createReport } from '@repo/supabase';

const CreateReportSchema = z.object({
  target_type: z.enum(['competition', 'profile', 'message', 'feed_item']),
  target_id: z.string().uuid(),
  competition_id: z.string().uuid().optional(),
  reason: z.string().min(5).max(500),
});

const REPORT_LIMIT = 5;
const REPORT_WINDOW_MS = 60 * 60 * 1000;
const reportBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(profileId: string): boolean {
  const now = Date.now();
  const bucket = reportBuckets.get(profileId);

  if (!bucket || bucket.resetAt <= now) {
    reportBuckets.set(profileId, { count: 1, resetAt: now + REPORT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > REPORT_LIMIT;
}

function getReportErrorStatus(code?: string): number {
  if (code?.startsWith('23') || code?.startsWith('PGRST')) {
    return 422;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORISED', message: 'Unauthorised' } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Invalid report data',
        },
      },
      { status: 422 },
    );
  }

  const { competition_id, ...reportData } = parsed.data;
  const competitionId = competition_id ?? (reportData.target_type === 'competition' ? reportData.target_id : undefined);

  if (isRateLimited(user.id)) {
    return NextResponse.json(
      {
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many reports submitted. Please try again later.',
        },
      },
      { status: 429 },
    );
  }

  const { data, error } = await createReport(client, {
    ...reportData,
    reporter_profile_id: user.id,
    ...(competitionId ? { competition_id: competitionId } : {}),
  });

  if (error) return NextResponse.json({ error }, { status: getReportErrorStatus(error.code) });
  return NextResponse.json({ data, error: null }, { status: 201 });
}
