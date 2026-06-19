// PATCH /api/moderation/reports/[reportId] — admin only: resolve or dismiss a report
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, resolveReport } from '@repo/supabase';

type ReportAction = 'suspend_host' | 'warn_user' | 'remove_competition' | 'dismiss';

interface RequestBody {
  action: ReportAction;
  competition_id?: string;
}

interface Params {
  params: { reportId: string };
}

const ADMIN_PROFILE_IDS = (process.env.ADMIN_PROFILE_IDS ?? '').split(',').filter(Boolean);
const VALID_ACTIONS: ReportAction[] = ['suspend_host', 'warn_user', 'remove_competition', 'dismiss'];

export async function PATCH(request: NextRequest, { params }: Params) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) return NextResponse.json({ data: null, error: { code: 'UNAUTHORISED', message: 'Unauthorised' } }, { status: 401 });

  if (!ADMIN_PROFILE_IDS.includes(user.id)) {
    return NextResponse.json({ data: null, error: { code: 'FORBIDDEN', message: 'Admin only' } }, { status: 403 });
  }

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'Invalid request body' } }, { status: 400 });
  }

  if (!body.action || !VALID_ACTIONS.includes(body.action)) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: `action must be one of: ${VALID_ACTIONS.join(', ')}` } }, { status: 400 });
  }

  if (body.action === 'remove_competition' && !body.competition_id) {
    return NextResponse.json({ data: null, error: { code: 'BAD_REQUEST', message: 'competition_id is required for remove_competition action' } }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const resolvePayload = {
    action: body.action,
    ...(body.competition_id ? { competition_id: body.competition_id } : {}),
  };
  const { data, error } = await resolveReport(adminClient, params.reportId, resolvePayload);

  if (error) return NextResponse.json({ data: null, error }, { status: 500 });
  return NextResponse.json({ data, error: null });
}
