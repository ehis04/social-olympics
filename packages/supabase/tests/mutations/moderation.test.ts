// Integration tests for moderation mutations: createReport, resolveReport.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createReport } from '../../src/mutations/moderation/create-report';
import { resolveReport } from '../../src/mutations/moderation/resolve-report';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let reporterId: string;
let targetId: string;
let competitionId: string;
let reportId: string;

beforeAll(async () => {
  reporterId = await createTestAuthUser(admin, `reporter-${Date.now()}`);
  targetId = await createTestAuthUser(admin, `target-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Mod Test ${Date.now()}`, host_id: reporterId, is_public: false, status: 'active', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;
});

afterAll(async () => {
  await admin.from('reports').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, reporterId);
  await deleteTestAuthUser(admin, targetId);
});

describe('createReport', () => {
  it('creates a pending report with a valid reason', async () => {
    const result = await createReport(admin, {
      reporter_profile_id: reporterId,
      target_type: 'profile',
      target_id: targetId,
      reason: 'This user posted offensive content in chat',
      competition_id: competitionId,
    });

    expect(result.error).toBeNull();
    const report = result.data as { id: string; status: string };
    expect(report.status).toBe('pending');
    reportId = report.id;
  });

  it('rejects a report with a reason shorter than 5 characters', async () => {
    const result = await createReport(admin, {
      reporter_profile_id: reporterId,
      target_type: 'profile',
      target_id: targetId,
      reason: 'Bad',
      competition_id: competitionId,
    });

    expect(result.error).not.toBeNull();
  });
});

describe('resolveReport', () => {
  it('dismissing a report sets status to dismissed', async () => {
    const result = await resolveReport(admin, reportId, { action: 'dismiss' });

    expect(result.error).toBeNull();
    expect((result.data as { status: string } | null)?.status).toBe('dismissed');
    expect((result.data as { resolved_at: string | null } | null)?.resolved_at).not.toBeNull();
  });

  it('remove_competition action archives the competition', async () => {
    const { data: report2 } = await admin
      .from('reports')
      .insert({
        reporter_profile_id: reporterId,
        target_type: 'competition',
        target_id: competitionId,
        reason: 'Competition is promoting harmful behaviour',
        competition_id: competitionId,
      })
      .select()
      .single();

    const result = await resolveReport(admin, (report2 as { id: string }).id, {
      action: 'remove_competition',
      competition_id: competitionId,
    });

    expect(result.error).toBeNull();

    const { data: comp } = await admin
      .from('competitions')
      .select('status')
      .eq('id', competitionId)
      .single();

    expect((comp as { status: string } | null)?.status).toBe('archived');
  });
});
