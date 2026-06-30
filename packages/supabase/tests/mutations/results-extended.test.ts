// Integration tests for extended result mutations: resolveDispute, submitWeightliftingBid.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { submitResult } from '../../src/mutations/results/submit-result';
import { confirmResult } from '../../src/mutations/results/confirm-result';
import { raiseDispute } from '../../src/mutations/results/raise-dispute';
import { resolveDispute } from '../../src/mutations/results/resolve-dispute';
import { submitWeightliftingBid } from '../../src/mutations/results/submit-weightlifting-bid';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let profileId: string;
let competitionId: string;
let competitionEventId: string;
let weightliftingEventId: string;
let resultId: string;
let disputeId: string;

beforeAll(async () => {
  profileId = await createTestAuthUser(admin, `result-ext-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `Results Ext ${Date.now()}`, host_id: profileId, is_public: false, status: 'active', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  // Standard event
  const { data: ev } = await admin.from('events').select('id').eq('result_type', 'time').limit(1).single();
  const { data: ce } = await admin
    .from('competition_events')
    .insert({ competition_id: competitionId, event_id: (ev as { id: string }).id, sequence_order: 1, status: 'active' })
    .select()
    .single();
  competitionEventId = (ce as { id: string }).id;

  // Weightlifting event
  const { data: wev } = await admin.from('events').select('id').eq('result_type', 'weight').limit(1).single();
  const { data: wce } = await admin
    .from('competition_events')
    .insert({ competition_id: competitionId, event_id: (wev as { id: string }).id, sequence_order: 2, status: 'active' })
    .select()
    .single();
  weightliftingEventId = (wce as { id: string }).id;

  await admin
    .from('competition_members')
    .insert({ competition_id: competitionId, profile_id: profileId, role: 'competitor' });

  // Create and confirm a result so we can raise a dispute
  const { data: r } = await admin
    .from('results')
    .insert({
      competition_event_id: competitionEventId,
      profile_id: profileId,
      result_value_primary: 9.8,
      is_dnf: false,
      submitted_by: profileId,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();
  resultId = (r as { id: string }).id;

  await admin
    .from('results')
    .update({ confirmed_at: new Date().toISOString(), confirmed_by: profileId, finishing_place: 1, points_awarded: 10, participation_points: 0.1 })
    .eq('id', resultId);

  await admin.from('competition_events').update({ status: 'confirmed' }).eq('id', competitionEventId);
});

afterAll(async () => {
  await admin.from('result_disputes').delete().eq('result_id', resultId);
  await admin.from('results').delete().eq('competition_event_id', competitionEventId);
  await admin.from('weightlifting_bids').delete().eq('competition_event_id', weightliftingEventId);
  await admin.from('competition_events').delete().eq('competition_id', competitionId);
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, profileId);
});

describe('raiseDispute', () => {
  it('creates a dispute and sets event status to disputed', async () => {
    const result = await raiseDispute(admin, {
      result_id: resultId,
      raised_by: profileId,
      reason: 'Incorrect result recorded',
    });

    expect(result.error).toBeNull();
    disputeId = (result.data as { id: string }).id;

    const { data: ev } = await admin.from('competition_events').select('status').eq('id', competitionEventId).single();
    expect((ev as { status: string } | null)?.status).toBe('disputed');
  });
});

describe('resolveDispute', () => {
  it('dismissing a dispute moves event back to confirmed', async () => {
    const result = await resolveDispute(admin, disputeId, 'dismiss');
    expect(result.error).toBeNull();
    expect((result.data as { status: string } | null)?.status).toBe('dismissed');

    const { data: ev } = await admin.from('competition_events').select('status').eq('id', competitionEventId).single();
    expect((ev as { status: string } | null)?.status).toBe('confirmed');
  });

  it('resolving a dispute sets status to resolved', async () => {
    // Raise another dispute to resolve
    const { data: dispute2 } = await admin
      .from('result_disputes')
      .insert({ result_id: resultId, raised_by: profileId, reason: 'Second dispute' })
      .select()
      .single();

    const result = await resolveDispute(admin, (dispute2 as { id: string }).id, 'resolve');
    expect(result.error).toBeNull();
    expect((result.data as { status: string } | null)?.status).toBe('resolved');
  });
});

describe('submitWeightliftingBid', () => {
  it('creates a bid for round 1 with valid weight', async () => {
    const result = await submitWeightliftingBid(admin, {
      competition_event_id: weightliftingEventId,
      profile_id: profileId,
      bid_weight_kg: 100,
      bid_round: 1,
      attempt_status: 'pending',
    });

    expect(result.error).toBeNull();
    expect((result.data as { bid_weight_kg: number } | null)?.bid_weight_kg).toBe(100);
  });

  it('rejects a bid weight above 500 kg', async () => {
    const result = await submitWeightliftingBid(admin, {
      competition_event_id: weightliftingEventId,
      profile_id: profileId,
      bid_weight_kg: 600,
      bid_round: 2,
      attempt_status: 'pending',
    });

    expect(result.error).not.toBeNull();
  });

  it('rejects a duplicate bid for the same round', async () => {
    const result = await submitWeightliftingBid(admin, {
      competition_event_id: weightliftingEventId,
      profile_id: profileId,
      bid_weight_kg: 105,
      bid_round: 1,
      attempt_status: 'pending',
    });

    expect(result.error).not.toBeNull();
  });
});
