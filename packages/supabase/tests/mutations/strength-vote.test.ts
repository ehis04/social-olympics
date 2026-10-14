import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';
import { submitStrengthVote } from '../../src/mutations/social/submit-strength-vote';

const admin = createTestAdminClient();
const users: string[] = [];
let competitionId: string;
let teamMemberId: string;

beforeAll(async () => {
  for (let i = 0; i < 4; i++) users.push(await createTestAuthUser(admin, `strength-${i}`));
  const { data: competition } = await admin.from('competitions').insert({ name: 'Strength regression', host_id: users[0]!, is_public: false, min_events_required: 1 }).select('id').single();
  competitionId = competition!.id;
  await admin.from('competition_members').insert(users.map((profile_id) => ({ competition_id: competitionId, profile_id, role: 'competitor' as const, status: 'active' as const })));
  const { data: event } = await admin.from('events').select('id').limit(1).single();
  const { data: competitionEvent } = await admin.from('competition_events').insert({ competition_id: competitionId, event_id: event!.id, sequence_order: 1 }).select('id').single();
  const { data: team } = await admin.from('teams').insert({ competition_event_id: competitionEvent!.id, name: 'Unassigned' }).select('id').single();
  const { data: teamMember } = await admin.from('team_members').insert({ team_id: team!.id, profile_id: users[1]!, strength_rating: 5, rating_source: 'peer_voted' }).select('id').single();
  teamMemberId = teamMember!.id;
});

afterAll(async () => {
  if (competitionId) await admin.from('competitions').delete().eq('id', competitionId);
  for (const user of users) await deleteTestAuthUser(admin, user);
});

describe('strength voting', () => {
  it('waits for a majority of eligible peers, then confirms the rating', async () => {
    const first = await submitStrengthVote(admin, { team_member_id: teamMemberId, voter_profile_id: users[0]!, vote: 'confirm', submission_round: 1 });
    expect(first.error).toBeNull();
    expect(first.data?.outcome).toBeUndefined();
    const second = await submitStrengthVote(admin, { team_member_id: teamMemberId, voter_profile_id: users[2]!, vote: 'confirm', submission_round: 1 });
    expect(second.error).toBeNull();
    expect(second.data?.outcome).toBe('confirmed');
    const { data: member } = await admin.from('team_members').select('confirmed_at').eq('id', teamMemberId).single();
    expect(member?.confirmed_at).not.toBeNull();
  });
  it('counts round-two votes separately from the first round', async () => {
    const first = await submitStrengthVote(admin, { team_member_id: teamMemberId, voter_profile_id: users[0]!, vote: 'reject', submission_round: 2 });
    expect(first.data?.outcome).toBeUndefined();
    const second = await submitStrengthVote(admin, { team_member_id: teamMemberId, voter_profile_id: users[2]!, vote: 'reject', submission_round: 2 });
    expect(second.data?.outcome).toBe('host_required');
  });
});
