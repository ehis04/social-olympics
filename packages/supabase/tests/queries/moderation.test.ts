// Integration tests for moderation queries against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getReports } from '../../src/queries/moderation/get-reports';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let reporterId: string;
let targetId: string;
let competitionId: string;

beforeAll(async () => {
  reporterId = await createTestAuthUser(admin, `mod-q-reporter-${Date.now()}`);
  targetId = await createTestAuthUser(admin, `mod-q-target-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Mod Query ${Date.now()}`, host_id: reporterId, is_public: false, status: 'active', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  // Seed reports with different statuses
  await admin.from('reports').insert([
    {
      reporter_profile_id: reporterId,
      target_type: 'profile',
      target_id: targetId,
      reason: 'User harassed other members repeatedly',
      status: 'pending',
      competition_id: competitionId,
    },
    {
      reporter_profile_id: reporterId,
      target_type: 'competition',
      target_id: competitionId,
      reason: 'Competition promoted dangerous activities',
      status: 'actioned',
      competition_id: competitionId,
    },
    {
      reporter_profile_id: reporterId,
      target_type: 'profile',
      target_id: targetId,
      reason: 'Spam messages sent to all members',
      status: 'dismissed',
      competition_id: competitionId,
    },
  ]);
});

afterAll(async () => {
  await admin.from('reports').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, reporterId);
  await deleteTestAuthUser(admin, targetId);
});

describe('getReports', () => {
  it('returns all reports when no status filter is applied', async () => {
    const result = await getReports(admin);
    expect(result.error).toBeNull();
    const reports = result.data ?? [];
    expect(reports.length).toBeGreaterThanOrEqual(3);
  });

  it('filters to pending reports only', async () => {
    const result = await getReports(admin, 'pending');
    expect(result.error).toBeNull();
    const reports = result.data ?? [];
    expect(reports.length).toBeGreaterThan(0);
    expect(reports.every((r: unknown) => (r as { status: string }).status === 'pending')).toBe(true);
  });

  it('filters to actioned reports only', async () => {
    const result = await getReports(admin, 'actioned');
    expect(result.error).toBeNull();
    const reports = result.data ?? [];
    expect(reports.every((r: unknown) => (r as { status: string }).status === 'actioned')).toBe(true);
  });

  it('embeds reporter profile info', async () => {
    const result = await getReports(admin, 'pending');
    const reports = (result.data ?? []) as { reporter: { id: string } | null }[];
    const testReport = reports.find((r) => r.reporter?.id === reporterId);
    expect(testReport).toBeDefined();
  });

  it('paginates correctly with limit', async () => {
    const result = await getReports(admin, undefined, { limit: 1 });
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBe(1);
    expect(result.hasMore).toBe(true);
  });

  it('cursor-based pagination returns the next page', async () => {
    const page1 = await getReports(admin, undefined, { limit: 1 });
    const page2 = await getReports(admin, undefined, { limit: 1, ...(page1.nextCursor ? { cursor: page1.nextCursor } : {}) });
    expect(page2.error).toBeNull();
    const p1Id = ((page1.data ?? [])[0] as { id: string })?.id;
    const p2Id = ((page2.data ?? [])[0] as { id: string })?.id;
    expect(p1Id).not.toBe(p2Id);
  });
});
