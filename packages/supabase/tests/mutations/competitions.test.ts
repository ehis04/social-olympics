// Integration tests for competition mutations against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createCompetition } from '../../src/mutations/competitions/create-competition';
import { updateCompetition } from '../../src/mutations/competitions/update-competition';
import { completeCompetition } from '../../src/mutations/competitions/complete-competition';
import { updateMemberRole } from '../../src/mutations/competitions/update-member-role';
import { createGhostProfile } from '../../src/mutations/competitions/create-ghost-profile';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let hostId: string;
let memberId: string;
let competitionId: string;
let memberRowId: string;
let ghostUserId: string;

beforeAll(async () => {
  hostId = await createTestAuthUser(admin, `comp-host-${Date.now()}`);
  memberId = await createTestAuthUser(admin, `comp-member-${Date.now()}`);
});

afterAll(async () => {
  if (ghostUserId) await admin.auth.admin.deleteUser(ghostUserId);
  if (competitionId) await admin.from('competitions').delete().eq('id', competitionId);
  await deleteTestAuthUser(admin, memberId);
  await deleteTestAuthUser(admin, hostId);
});

describe('createCompetition', () => {
  it('creates a competition with an auto-generated invite code', async () => {
    const result = await createCompetition(admin, {
      name: `Test Comp ${Date.now()}`,
      host_id: hostId,
      is_public: false,
      status: 'setup',
      min_events_required: 2,
    });

    expect(result.error).toBeNull();
    const comp = result.data as { id: string; invite_code: string };
    expect(comp.id).toBeTruthy();
    expect(comp.invite_code).toHaveLength(8);
    competitionId = comp.id;
  });

  it('rejects a competition name shorter than 3 characters', async () => {
    const result = await createCompetition(admin, {
      name: 'AB',
      host_id: hostId,
      is_public: false,
      status: 'setup',
      min_events_required: 1,
    });

    expect(result.error).not.toBeNull();
  });

  it('rejects a competition name longer than 60 characters', async () => {
    const result = await createCompetition(admin, {
      name: 'A'.repeat(61),
      host_id: hostId,
      is_public: false,
      status: 'setup',
      min_events_required: 1,
    });

    expect(result.error).not.toBeNull();
  });
});

describe('updateCompetition', () => {
  it('updates the competition description', async () => {
    const result = await updateCompetition(admin, competitionId, {
      description: 'Updated description',
    });

    expect(result.error).toBeNull();
    expect((result.data as { description: string } | null)?.description).toBe('Updated description');
  });

  it('can transition status from setup to open', async () => {
    const result = await updateCompetition(admin, competitionId, { status: 'open' });
    expect(result.error).toBeNull();
    expect((result.data as { status: string } | null)?.status).toBe('open');
  });
});

describe('updateMemberRole', () => {
  it('adds a member and updates their role to spectator', async () => {
    const { data: member } = await admin
      .from('competition_members')
      .insert({ competition_id: competitionId, profile_id: memberId, role: 'competitor' })
      .select()
      .single();

    memberRowId = (member as { id: string }).id;

    const result = await updateMemberRole(admin, memberRowId, 'spectator');
    expect(result.error).toBeNull();
    expect((result.data as { role: string } | null)?.role).toBe('spectator');
  });

  it('can promote a member to cohost role', async () => {
    const result = await updateMemberRole(admin, memberRowId, 'cohost');
    expect(result.error).toBeNull();
    expect((result.data as { role: string } | null)?.role).toBe('cohost');
  });
});

describe('completeCompetition', () => {
  it('marks the competition complete and assigns final ranks', async () => {
    // Give members different point totals
    await admin
      .from('competition_members')
      .update({ total_points: 100, gold_count: 2 })
      .eq('id', memberRowId);

    // Add host as member (may already exist — ignore conflict)
    let hostMember: { id: string } | null = null;
    try {
      const { data } = await admin
        .from('competition_members')
        .insert({ competition_id: competitionId, profile_id: hostId, role: 'competitor', total_points: 50 })
        .select()
        .single();
      hostMember = data as { id: string } | null;
    } catch { /* already a member */ }

    const result = await completeCompetition(admin, competitionId);
    expect(result.error).toBeNull();
    expect((result.data as { status: string } | null)?.status).toBe('complete');
    expect((result.data as { completed_at: string | null } | null)?.completed_at).not.toBeNull();

    // Member with 100 points should be rank 1
    const { data: updatedMember } = await admin
      .from('competition_members')
      .select('final_rank')
      .eq('id', memberRowId)
      .single();

    expect((updatedMember as { final_rank: number } | null)?.final_rank).toBe(1);

    if (hostMember) {
      await admin.from('competition_members').delete().eq('id', (hostMember as { id: string }).id);
    }
  });
});

describe('createGhostProfile', () => {
  it('creates a ghost profile and adds them as a competition member', async () => {
    const result = await createGhostProfile(admin, 'GhostAthlete', competitionId);
    expect(result.error).toBeNull();

    const data = result.data as { profile: { id: string; is_ghost: boolean }; member: { role: string } } | null;
    expect(data?.profile.is_ghost).toBe(true);
    expect(data?.member.role).toBe('competitor');
    ghostUserId = data!.profile.id;
  });

  it('ghost profile appears as a competition member', async () => {
    const { data: members } = await admin
      .from('competition_members')
      .select('profile_id')
      .eq('competition_id', competitionId);

    const memberIds = (members ?? []).map((m: { profile_id: string }) => m.profile_id);
    expect(memberIds).toContain(ghostUserId);
  });
});
