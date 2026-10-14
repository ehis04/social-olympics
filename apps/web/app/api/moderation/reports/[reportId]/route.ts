/*
 * This file handles requests for the reportId API route.
 */

// PATCH /api/moderation/reports/[reportId] — admin only: resolve or dismiss a report
import { NextRequest, NextResponse } from 'next/server';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, resolveReport } from '@repo/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotification } from '@/lib/notifications/create-notification';

// Finds who is responsible for the reported content.
async function findResponsibleProfile(
  adminClient: SupabaseClient,
  targetType: string,
  targetId: string,
): Promise<string | null> {
  if (targetType === 'profile') return targetId;
  if (targetType === 'competition') {
    const { data } = await adminClient.from('competitions').select('host_id').eq('id', targetId).maybeSingle();
    return (data?.host_id as string | undefined) ?? null;
  }
  if (targetType === 'message') {
    const { data } = await adminClient.from('messages').select('sender_profile_id').eq('id', targetId).maybeSingle();
    return (data?.sender_profile_id as string | undefined) ?? null;
  }
  if (targetType === 'feed_item') {
    const { data } = await adminClient.from('activity_feed').select('actor_profile_id').eq('id', targetId).maybeSingle();
    return (data?.actor_profile_id as string | undefined) ?? null;
  }
  return null;
}

type ReportAction = 'suspend_host' | 'warn_user' | 'remove_competition' | 'dismiss';

interface RequestBody {
  action: ReportAction;
  competition_id?: string;
}

interface Params {
  params: Promise<{ reportId: string }>;
}

const ADMIN_PROFILE_IDS = (process.env.ADMIN_PROFILE_IDS ?? '').split(',').filter(Boolean);
const VALID_ACTIONS: ReportAction[] = ['suspend_host', 'warn_user', 'remove_competition', 'dismiss'];

// Handles patch.
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
  const { reportId } = await params;
  const { data: report } = await adminClient
    .from('reports')
    .select('id, status, target_type, target_id, competition_id')
    .eq('id', reportId)
    .maybeSingle();
  if (!report) return NextResponse.json({ data: null, error: { code: 'NOT_FOUND', message: 'Report not found' } }, { status: 404 });
  if (report.status !== 'pending') {
    return NextResponse.json({ data: null, error: { code: 'CONFLICT', message: 'This report has already been handled' } }, { status: 409 });
  }

  const { data, error } = await resolveReport(adminClient, reportId, resolvePayload);
  if (error) return NextResponse.json({ data: null, error }, { status: 500 });

  if (body.action !== 'dismiss') {
    const responsible = await findResponsibleProfile(adminClient, report.target_type, report.target_id);
    const competitionId = body.competition_id ?? report.competition_id ?? (report.target_type === 'competition' ? report.target_id : null);

    if (body.action === 'suspend_host' && responsible) {
      await adminClient.from('profile_suspensions').upsert({
        profile_id: responsible,
        report_id: reportId,
        reason: 'Suspended after a moderation review',
      });
    }

    const message = {
      warn_user: 'A moderator reviewed a report about your content and issued a warning. Please follow the community guidelines.',
      suspend_host: 'A moderator suspended your account from creating new competitions after reviewing a report.',
      remove_competition: 'A moderator removed your competition after reviewing a report. It has been archived.',
    }[body.action];

    if (responsible && message) {
      await createNotification(adminClient, {
        profileId: responsible,
        type: 'moderation_action',
        title: body.action === 'warn_user' ? 'Moderation warning' : 'Moderation action taken',
        body: message,
        data: competitionId ? { competition_id: competitionId } : {},
      });
    }
  }

  return NextResponse.json({ data, error: null });
}
