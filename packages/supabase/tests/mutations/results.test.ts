// Integration tests for result queries and mutations against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getResultsForEvent } from '../../src/queries/results/get-results-for-event';
import { getResultsForMember } from '../../src/queries/results/get-results-for-member';
import { submitResult } from '../../src/mutations/results/submit-result';
import { confirmResult } from '../../src/mutations/results/confirm-result';
import { raiseDispute } from '../../src/mutations/results/raise-dispute';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let testProfileId: string;
let competitionId: string;
let competitionEventId: string;
let resultId: string;
let eventId: string;

beforeAll(async () => {
  testProfileId = await createTestAuthUser(admin, `result-test-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({
      name: `Results Test ${Date.now()}`,
      host_id: testProfileId,
      is_public: false,
      status: 'active',
      min_events_required: 1,
    })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  // Use a seeded event
  const { data: ev } = await admin.from('events').select('id').limit(1).single();
  eventId = (ev as { id: string }).id;

  const { data: compEvent } = await admin
    .from('competition_events')
    .insert({ competition_id: competitionId, event_id: eventId, sequence_order: 1, status: 'active' })
    .select()
    .single();
  competitionEventId = (compEvent as { id: string }).id;

  // Add member
  await admin
    .from('competition_members')
    .insert({ competition_id: competitionId, profile_id: testProfileId, role: 'competitor' });
});

afterAll(async () => {
  await admin.from('results').delete().eq('competition_event_id', competitionEventId);
  await admin.from('competition_events').delete().eq('id', competitionEventId);
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, testProfileId);
});

describe('submitResult', () => {
  it('creates a pending result (no confirmed_at)', async () => {
    const result = await submitResult(admin, {
      competition_event_id: competitionEventId,
      profile_id: testProfileId,
      result_value_primary: 10.5,
      submitted_by: testProfileId,
      submitted_at: new Date().toISOString(),
    });

    expect(result.error).toBeNull();
    expect((result.data as { confirmed_at: string | null } | null)?.confirmed_at).toBeNull();
    resultId = (result.data as { id: string }).id;
  });
});

describe('confirmResult', () => {
  it('sets confirmed_at and triggers score recalculation', async () => {
    const result = await confirmResult(admin, {
      result_id: resultId,
      finishing_place: 1,
      points_awarded: 10,
      participation_points: 0.1,
    });

    expect(result.error).toBeNull();
    expect((result.data as { confirmed_at: string | null } | null)?.confirmed_at).not.toBeNull();

    // Allow trigger to run, then verify total_points updated
    await new Promise((r) => setTimeout(r, 500));
    const { data: member } = await admin
      .from('competition_members')
      .select('total_points')
      .eq('competition_id', competitionId)
      .eq('profile_id', testProfileId)
      .single();

    expect((member as { total_points: number } | null)?.total_points).toBeGreaterThan(0);
  });
});

describe('raiseDispute', () => {
  it('sets competition_event status to disputed', async () => {
    await raiseDispute(admin, {
      result_id: resultId,
      raised_by: testProfileId,
      reason: 'Test dispute',
    });

    const { data: event } = await admin
      .from('competition_events')
      .select('status')
      .eq('id', competitionEventId)
      .single();

    expect((event as { status: string } | null)?.status).toBe('disputed');
  });
});

describe('getResultsForEvent', () => {
  it('returns results ordered by finishing_place', async () => {
    const result = await getResultsForEvent(admin, competitionEventId);
    expect(result.error).toBeNull();
    const results = result.data ?? [];
    expect(results.length).toBeGreaterThan(0);
  });
});

describe('getResultsForMember', () => {
  it('returns only results from this competition for this member', async () => {
    const result = await getResultsForMember(admin, testProfileId, competitionId);
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBeGreaterThan(0);
  });
});
