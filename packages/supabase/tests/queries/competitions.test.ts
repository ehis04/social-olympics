// Integration tests for competition queries and mutations against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createBrowserClient } from '../../src/client/browser';
import { getPublicCompetitions, getCompetitionByInviteCode } from '../../src/queries/competitions/get-public-competitions';
import { getCompetitionByInviteCode as getByCode } from '../../src/queries/competitions/get-competition-by-invite-code';
import { createCompetition } from '../../src/mutations/competitions/create-competition';
import { addMember } from '../../src/mutations/competitions/add-member';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let testHostId: string;
let competitionId: string;
let inviteCode: string;

beforeAll(async () => {
  testHostId = await createTestAuthUser(admin, `test-host-${Date.now()}`);

  // Create a public competition
  const { data: comp } = await admin
    .from('competitions')
    .insert({
      name: `Test Competition ${Date.now()}`,
      host_id: testHostId,
      is_public: true,
      status: 'setup',
      min_events_required: 1,
    })
    .select()
    .single();

  const c = comp as { id: string; invite_code: string };
  competitionId = c.id;
  inviteCode = c.invite_code;
});

afterAll(async () => {
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, testHostId);
});

describe('getPublicCompetitions', () => {
  it('returns only public, non-archived competitions', async () => {
    const result = await getPublicCompetitions(admin);
    expect(result.error).toBeNull();
    const comps = result.data ?? [];
    expect(comps.every((c: unknown) => (c as { is_public: boolean }).is_public)).toBe(true);
    expect(comps.every((c: unknown) => (c as { status: string }).status !== 'archived')).toBe(true);
  });

  it('filters by name search query', async () => {
    const result = await getPublicCompetitions(admin, { q: 'Test Competition' });
    expect(result.error).toBeNull();
    expect((result.data ?? []).length).toBeGreaterThan(0);
  });
});

describe('getCompetitionByInviteCode', () => {
  it('returns the correct competition for a valid invite code', async () => {
    const result = await getByCode(admin, inviteCode);
    expect(result.error).toBeNull();
    expect((result.data as { id: string } | null)?.id).toBe(competitionId);
  });

  it('is case-insensitive (uppercase normalised)', async () => {
    const result = await getByCode(admin, inviteCode.toLowerCase());
    expect(result.error).toBeNull();
    expect((result.data as { id: string } | null)?.id).toBe(competitionId);
  });
});

describe('addMember', () => {
  it('adds a member with the correct role', async () => {
    const memberId = await createTestAuthUser(admin, `test-member-${Date.now()}`);

    const result = await addMember(admin, competitionId, memberId, 'competitor');
    expect(result.error).toBeNull();
    expect((result.data as { role: string } | null)?.role).toBe('competitor');

    await admin.from('competition_members').delete().eq('competition_id', competitionId).eq('profile_id', memberId);
    await deleteTestAuthUser(admin, memberId);
  });
});
