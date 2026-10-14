/*
 * This file verifies users behavior.
 */

// Integration tests for user profile mutations against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { updateProfile } from '../../src/mutations/users/update-profile';
import { claimGhostProfile } from '../../src/mutations/users/claim-ghost-profile';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let realUserId: string;
let ghostUserId: string;
let claimingUserId: string;
let guestCompetitionId: string;
let guestResultId: string;

beforeAll(async () => {
  realUserId = await createTestAuthUser(admin, `update-profile-${Date.now()}`);
  claimingUserId = await createTestAuthUser(admin, `claiming-user-${Date.now()}`);

  // Create a ghost auth user — trigger auto-creates profile
  const { data: ghostAuth } = await admin.auth.admin.createUser({
    email: `ghost-${Date.now()}@ghost.internal`,
    email_confirm: true,
    user_metadata: { display_name: 'GhostUser' },
  });
  ghostUserId = ghostAuth.user!.id;

  await admin.from('profiles').update({ is_ghost: true }).eq('id', ghostUserId);
  const { data: competition } = await admin.from('competitions').insert({
    name: 'Guest transfer regression', host_id: realUserId, is_public: false, min_events_required: 1,
  }).select('id').single();
  guestCompetitionId = competition!.id;
  await admin.from('competition_members').insert({ competition_id: guestCompetitionId, profile_id: ghostUserId, role: 'competitor', status: 'active' });
  const { data: event } = await admin.from('events').select('id').eq('slug', '100m-sprint').single();
  const { data: competitionEvent } = await admin.from('competition_events').insert({
    competition_id: guestCompetitionId, event_id: event!.id, sequence_order: 1,
  }).select('id').single();
  const { data: result } = await admin.from('results').insert({
    competition_event_id: competitionEvent!.id, profile_id: ghostUserId, submitted_by: realUserId,
    result_value_primary: 9.8, finishing_place: 1, points_awarded: 10, participation_points: 0.1,
  }).select('id').single();
  guestResultId = result!.id;
  await admin.from('results').update({ confirmed_at: new Date().toISOString() }).eq('id', guestResultId);
});

afterAll(async () => {
  if (guestCompetitionId) await admin.from('competitions').delete().eq('id', guestCompetitionId);
  // Delete ghost first so its claimed_by FK doesn't block deleting claimingUserId
  await admin.auth.admin.deleteUser(ghostUserId).catch(() => {});
  await deleteTestAuthUser(admin, realUserId);
  await deleteTestAuthUser(admin, claimingUserId);
});

describe('updateProfile', () => {
  it('updates bio and city successfully', async () => {
    const result = await updateProfile(admin, realUserId, {
      bio: 'I love sprinting',
      city: 'London',
    });

    expect(result.error).toBeNull();
    expect((result.data as { bio: string } | null)?.bio).toBe('I love sprinting');
    expect((result.data as { city: string } | null)?.city).toBe('London');
  });

  it('rejects bio longer than 500 characters', async () => {
    const result = await updateProfile(admin, realUserId, {
      bio: 'A'.repeat(501),
    });

    expect(result.error).not.toBeNull();
  });

  it('updates country_code', async () => {
    const result = await updateProfile(admin, realUserId, { country_code: 'US' });
    expect(result.error).toBeNull();
    expect((result.data as { country_code: string } | null)?.country_code).toBe('US');
  });
});

describe('claimGhostProfile', () => {
  it('marks the ghost profile as claimed and clears is_ghost', async () => {
    const result = await claimGhostProfile(admin, ghostUserId, claimingUserId);

    expect(result.error).toBeNull();
    const profile = result.data as { is_ghost: boolean; claimed_by: string; claimed_at: string } | null;
    expect(profile?.is_ghost).toBe(false);
    expect(profile?.claimed_by).toBe(claimingUserId);
    expect(profile?.claimed_at).not.toBeNull();
    const { data: transferredResult } = await admin.from('results').select('profile_id').eq('id', guestResultId).single();
    expect(transferredResult?.profile_id).toBe(claimingUserId);
    const { data: transferredMember } = await admin.from('competition_members').select('profile_id, total_points, gold_count')
      .eq('competition_id', guestCompetitionId).single();
    expect(transferredMember?.profile_id).toBe(claimingUserId);
    expect(transferredMember?.total_points).toBe(10.1);
    expect(transferredMember?.gold_count).toBe(1);
    const { data: best } = await admin.from('personal_bests').select('result_value_primary').eq('profile_id', claimingUserId).single();
    expect(best?.result_value_primary).toBe(9.8);
  });

  it('rejects claiming a profile that is not a ghost', async () => {
    const result = await claimGhostProfile(admin, ghostUserId, claimingUserId);
    expect(result.error).not.toBeNull();
    expect(result.error?.code).toBe('NOT_GHOST');
  });

  it('rejects claiming a non-existent profile', async () => {
    const result = await claimGhostProfile(admin, '00000000-0000-0000-0000-000000000000', claimingUserId);
    expect(result.error).not.toBeNull();
  });
});
