// Integration tests for user profile queries against local Supabase.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getProfile } from '../../src/queries/users/get-profile';
import { getProfileByDisplayName } from '../../src/queries/users/get-profile-by-display-name';
import { getPersonalBests } from '../../src/queries/users/get-personal-bests';
import { createTestAdminClient } from '../helpers/admin-client';
import { createTestAuthUser, deleteTestAuthUser } from '../helpers/auth-users';

const admin = createTestAdminClient();

let profileId: string;
let displayName: string;
let personalBestEventId: string;

beforeAll(async () => {
  displayName = `AthleteUnique${Date.now()}`;
  profileId = await createTestAuthUser(admin, displayName);

  // Trigger auto-creates profile with is_ghost=false; update display_name to our deterministic value
  await admin.from('profiles').update({ display_name: displayName, bio: 'Test bio', city: 'Paris' }).eq('id', profileId);

  // Seed a personal best
  const { data: ev } = await admin.from('events').select('id').eq('is_active', true).limit(1).single();
  personalBestEventId = (ev as { id: string }).id;

  await admin.from('personal_bests').insert({
    profile_id: profileId,
    event_id: personalBestEventId,
    result_value_primary: 10.5,
    achieved_at: new Date().toISOString(),
  });
});

afterAll(async () => {
  await admin.from('personal_bests').delete().eq('profile_id', profileId);
  await deleteTestAuthUser(admin, profileId);
});

describe('getProfile', () => {
  it('returns profile with career_stats embedded', async () => {
    const result = await getProfile(admin, profileId);
    expect(result.error).toBeNull();
    const profile = result.data as { id: string; career_stats: unknown } | null;
    expect(profile?.id).toBe(profileId);
    expect(profile?.career_stats).not.toBeNull();
  });

  it('returns the correct bio and city', async () => {
    const result = await getProfile(admin, profileId);
    const profile = result.data as { bio: string; city: string } | null;
    expect(profile?.bio).toBe('Test bio');
    expect(profile?.city).toBe('Paris');
  });

  it('returns null data (not an error) for a non-existent profile', async () => {
    const result = await getProfile(admin, '00000000-0000-0000-0000-000000000000');
    expect(result.error).toBeNull();
    expect(result.data).toBeNull();
  });
});

describe('getProfileByDisplayName', () => {
  it('finds a profile by exact display name', async () => {
    const result = await getProfileByDisplayName(admin, displayName);
    expect(result.error).toBeNull();
    expect((result.data as { id: string } | null)?.id).toBe(profileId);
  });

  it('is case-insensitive (ilike match)', async () => {
    const result = await getProfileByDisplayName(admin, displayName.toLowerCase());
    expect(result.error).toBeNull();
    expect((result.data as { id: string } | null)?.id).toBe(profileId);
  });

  it('returns an error for a name that does not exist', async () => {
    const result = await getProfileByDisplayName(admin, 'NonexistentUser99999XYZ');
    expect(result.error).not.toBeNull();
  });
});

describe('getPersonalBests', () => {
  it('returns personal bests for the profile with event info', async () => {
    const result = await getPersonalBests(admin, profileId);
    expect(result.error).toBeNull();
    const pbs = result.data ?? [];
    expect(pbs.length).toBeGreaterThan(0);

    const pb = pbs[0] as { event_id: string; result_value_primary: number; events: { name: string } };
    expect(pb.event_id).toBe(personalBestEventId);
    expect(pb.result_value_primary).toBe(10.5);
    expect(pb.events.name).toBeTruthy();
  });

  it('returns empty array for a profile with no personal bests', async () => {
    const newId = await createTestAuthUser(admin, `no-pb-user-${Date.now()}`);
    const result = await getPersonalBests(admin, newId);
    expect(result.error).toBeNull();
    expect(result.data?.length).toBe(0);
    await deleteTestAuthUser(admin, newId);
  });
});
