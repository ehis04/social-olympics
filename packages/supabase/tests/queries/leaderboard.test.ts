// Integration tests for leaderboard queries against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getLeaderboard } from '../../src/queries/leaderboard/get-leaderboard';
import { getTeamLeaderboard } from '../../src/queries/leaderboard/get-team-leaderboard';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let hostId: string;
let memberAId: string;
let memberBId: string;
let memberCId: string;
let competitionId: string;
let competitionEventId: string;
let teamAId: string;
let teamBId: string;

beforeAll(async () => {
  hostId = await createTestAuthUser(admin, `lb-host-${Date.now()}`);
  memberAId = await createTestAuthUser(admin, `lb-a-${Date.now()}`);
  memberBId = await createTestAuthUser(admin, `lb-b-${Date.now()}`);
  memberCId = await createTestAuthUser(admin, `lb-c-${Date.now()}`);

  const { data: comp } = await admin
    .from('competitions')
    .insert({ name: `LB Test ${Date.now()}`, host_id: hostId, is_public: false, status: 'active', min_events_required: 1 })
    .select()
    .single();
  competitionId = (comp as { id: string }).id;

  // Different point totals for ranking tests
  await admin.from('competition_members').insert([
    { competition_id: competitionId, profile_id: memberAId, role: 'competitor', status: 'active', total_points: 150, gold_count: 3, silver_count: 1 },
    { competition_id: competitionId, profile_id: memberBId, role: 'competitor', status: 'active', total_points: 100, gold_count: 2, silver_count: 0 },
    { competition_id: competitionId, profile_id: memberCId, role: 'competitor', status: 'active', total_points: 100, gold_count: 1, silver_count: 2 },
  ]);

  // Team event for team leaderboard
  const { data: ev } = await admin.from('events').select('id').limit(1).single();
  const { data: ce } = await admin
    .from('competition_events')
    .insert({ competition_id: competitionId, event_id: (ev as { id: string }).id, sequence_order: 1, status: 'confirmed', weight_multiplier: 1.0 })
    .select()
    .single();
  competitionEventId = (ce as { id: string }).id;

  const { data: ta } = await admin
    .from('teams')
    .insert({ competition_event_id: competitionEventId, name: 'Team Alpha', result_place: 1 })
    .select()
    .single();
  teamAId = (ta as { id: string }).id;

  const { data: tb } = await admin
    .from('teams')
    .insert({ competition_event_id: competitionEventId, name: 'Team Beta', result_place: 2 })
    .select()
    .single();
  teamBId = (tb as { id: string }).id;

  await admin.from('team_members').insert([
    { team_id: teamAId, profile_id: memberAId, strength_rating: 8, rating_source: 'historical' },
    { team_id: teamBId, profile_id: memberBId, strength_rating: 7, rating_source: 'historical' },
  ]);
});

afterAll(async () => {
  await admin.from('team_members').delete().eq('team_id', teamAId);
  await admin.from('team_members').delete().eq('team_id', teamBId);
  await admin.from('teams').delete().in('id', [teamAId, teamBId]);
  await admin.from('competition_events').delete().eq('id', competitionEventId);
  await admin.from('competition_members').delete().eq('competition_id', competitionId);
  await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, hostId);
  await deleteTestAuthUser(admin, memberAId);
  await deleteTestAuthUser(admin, memberBId);
  await deleteTestAuthUser(admin, memberCId);
});

describe('getLeaderboard', () => {
  it('returns all members ordered by points descending then medals', async () => {
    const result = await getLeaderboard(admin, competitionId);
    expect(result.error).toBeNull();
    const members = result.data ?? [];
    expect(members.length).toBe(3);

    const first = members[0] as { total_points: number };
    const second = members[1] as { total_points: number };
    expect(first.total_points).toBeGreaterThanOrEqual(second.total_points);
  });

  it('breaks ties by gold_count then silver_count', async () => {
    const result = await getLeaderboard(admin, competitionId);
    const members = result.data ?? [];
    // memberB (2 gold) should rank above memberC (1 gold) despite same points
    const memberBRow = members.find((m: unknown) => (m as { profile_id: string }).profile_id === memberBId);
    const memberCRow = members.find((m: unknown) => (m as { profile_id: string }).profile_id === memberCId);
    const memberBIndex = members.indexOf(memberBRow!);
    const memberCIndex = members.indexOf(memberCRow!);
    expect(memberBIndex).toBeLessThan(memberCIndex);
  });

  it('embeds profile display_name on each entry', async () => {
    const result = await getLeaderboard(admin, competitionId);
    const first = (result.data ?? [])[0] as { profiles: { display_name: string } | null };
    expect(first.profiles?.display_name).toBeTruthy();
  });

  it('returns empty array for a competition with no members', async () => {
    const { data: emptyComp } = await admin
      .from('competitions')
      .insert({ name: `LB Empty ${Date.now()}`, host_id: hostId, is_public: false, status: 'setup', min_events_required: 1 })
      .select()
      .single();

    const result = await getLeaderboard(admin, (emptyComp as { id: string }).id);
    expect(result.data?.length).toBe(0);

    await admin.from('competitions').delete().eq('id', (emptyComp as { id: string }).id);
  });
});

describe('getTeamLeaderboard', () => {
  it('returns entries for each team in the competition', async () => {
    const result = await getTeamLeaderboard(admin, competitionId);
    expect(result.error).toBeNull();
    const entries = result.data ?? [];
    expect(entries.length).toBe(2);
  });

  it('ranks teams with first place higher than second place', async () => {
    const result = await getTeamLeaderboard(admin, competitionId);
    const entries = result.data ?? [];
    const alphaEntry = entries.find((e) => e.team_name === 'Team Alpha');
    const betaEntry = entries.find((e) => e.team_name === 'Team Beta');
    expect(alphaEntry?.rank).toBeLessThan(betaEntry?.rank ?? Infinity);
  });

  it('includes member display names on each entry', async () => {
    const result = await getTeamLeaderboard(admin, competitionId);
    const alpha = (result.data ?? []).find((e) => e.team_name === 'Team Alpha');
    expect(alpha?.members.length).toBe(1);
    expect(typeof alpha?.members[0]).toBe('string');
  });

  it('returns empty array for competition with no team events', async () => {
    const { data: noTeamComp } = await admin
      .from('competitions')
      .insert({ name: `No Teams ${Date.now()}`, host_id: hostId, is_public: false, status: 'setup', min_events_required: 1 })
      .select()
      .single();

    const result = await getTeamLeaderboard(admin, (noTeamComp as { id: string }).id);
    expect(result.data?.length).toBe(0);

    await admin.from('competitions').delete().eq('id', (noTeamComp as { id: string }).id);
  });
});
