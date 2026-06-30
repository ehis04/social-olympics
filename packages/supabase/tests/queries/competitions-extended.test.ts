// Integration tests for extended competition queries against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getCompetition } from '../../src/queries/competitions/get-competition';
import { getCompetitionMembers } from '../../src/queries/competitions/get-competition-members';
import { getUserCompetitions } from '../../src/queries/competitions/get-user-competitions';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let hostId: string;
let cohostId: string;
let memberId: string;
let competitionId: string;

beforeAll(async () => {
  hostId = await createTestAuthUser(admin, `comp-q-host-${Date.now()}`);
  cohostId = await createTestAuthUser(admin, `comp-q-cohost-${Date.now()}`);
  memberId = await createTestAuthUser(admin, `comp-q-member-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({
      name: `Query Test Comp ${Date.now()}`,
      host_id: hostId,
      cohost_id: cohostId,
      is_public: true,
      status: 'active',
      min_events_required: 2,
    })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  await admin.from('competition_members').insert([
    { competition_id: competitionId, profile_id: hostId, role: 'competitor', status: 'active', total_points: 50, gold_count: 1 },
    { competition_id: competitionId, profile_id: memberId, role: 'competitor', status: 'active', total_points: 100, gold_count: 2 },
  ]);
});

afterAll(async () => {
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, hostId);
  await deleteTestAuthUser(admin, cohostId);
  await deleteTestAuthUser(admin, memberId);
});

describe('getCompetition', () => {
  it('returns the competition with embedded host profile', async () => {
    const result = await getCompetition(admin, competitionId);
    expect(result.error).toBeNull();
    const comp = result.data as { id: string; host: { id: string } | null } | null;
    expect(comp?.id).toBe(competitionId);
    expect(comp?.host?.id).toBe(hostId);
  });

  it('embeds cohost profile when cohost_id is set', async () => {
    const result = await getCompetition(admin, competitionId);
    const comp = result.data as { cohost: { id: string } | null } | null;
    expect(comp?.cohost?.id).toBe(cohostId);
  });

  it('returns null for a non-existent competition id', async () => {
    const result = await getCompetition(admin, '00000000-0000-0000-0000-000000000000');
    expect(result.error).not.toBeNull();
  });
});

describe('getCompetitionMembers', () => {
  it('returns all members ordered by total_points descending', async () => {
    const result = await getCompetitionMembers(admin, competitionId);
    expect(result.error).toBeNull();
    const members = result.data ?? [];
    expect(members.length).toBe(2);
    const first = members[0] as { total_points: number };
    const second = members[1] as { total_points: number };
    expect(first.total_points).toBeGreaterThanOrEqual(second.total_points);
  });

  it('embeds profile info on each member', async () => {
    const result = await getCompetitionMembers(admin, competitionId);
    const members = result.data ?? [];
    const member = members[0] as { profile: { id: string } | null };
    expect(member.profile).not.toBeNull();
    expect(member.profile?.id).toBeTruthy();
  });

  it('returns empty array for a competition with no members', async () => {
    const { data: emptyComp } = await admin
      .from('competitions')
      .insert({ name: `Empty Comp ${Date.now()}`, host_id: hostId, is_public: false, status: 'setup', min_events_required: 1 })
      .select()
      .single();

    const result = await getCompetitionMembers(admin, (emptyComp as { id: string }).id);
    expect(result.data?.length).toBe(0);

    await admin.from('competitions').delete().eq('id', (emptyComp as { id: string }).id);
  });
});

describe('getUserCompetitions', () => {
  it('returns competitions where user is a member', async () => {
    const result = await getUserCompetitions(admin, memberId);
    expect(result.error).toBeNull();
    const comps = result.data ?? [];
    const ids = comps.map((c: unknown) => (c as { id: string }).id);
    expect(ids).toContain(competitionId);
  });

  it('returns hosted competitions even without member row', async () => {
    const result = await getUserCompetitions(admin, hostId);
    const ids = (result.data ?? []).map((c: unknown) => (c as { id: string }).id);
    expect(ids).toContain(competitionId);
  });

  it('returns empty array for a user with no competitions', async () => {
    const result = await getUserCompetitions(admin, cohostId);
    expect(result.error).toBeNull();
    expect(result.data?.length).toBe(0);
  });
});
