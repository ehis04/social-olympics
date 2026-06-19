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

function getReportErrorStatus(code?: string): number {
  if (code?.startsWith('23') || code?.startsWith('PGRST')) {
    return 422;
  }

  return 500;
}

export async function POST(request: NextRequest) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } },
      { status: 400 },
    );
  }

  const parsed = CreateReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
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

  if (reportData.target_type === 'profile' && reportData.target_id === user.id) {
    return NextResponse.json(
      { data: null, error: { code: 'BAD_REQUEST', message: 'Cannot report yourself' } },
      { status: 400 },
    );
  }

  const { data, error } = await createReport(client, {
    ...reportData,
    reporter_profile_id: user.id,
    status: 'pending',
    ...(competitionId ? { competition_id: competitionId } : {}),
  });

  if (error) {
    return NextResponse.json(
      { data: null, error },
      { status: getReportErrorStatus(error.code) },
    );
  }

  return NextResponse.json({ data, error: null }, { status: 201 });
}
