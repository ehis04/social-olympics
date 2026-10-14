/*
 * This file deletes a user's account while keeping other people's competition history intact.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { createNotifications } from '@/lib/notifications/create-notification';

export const DELETED_DISPLAY_NAME = 'Deleted user';

// Gives each unfinished competition the person hosts a new host: the co-host if there is one,
// otherwise the longest-standing active competitor. Competitions with nobody left are archived.
async function handOverHostedCompetitions(adminClient: SupabaseClient, profileId: string): Promise<void> {
  const { data: hosted } = await adminClient
    .from('competitions')
    .select('id, name, cohost_id, status')
    .eq('host_id', profileId)
    .not('status', 'in', '(complete,archived)');

  for (const competition of hosted ?? []) {
    let newHost = (competition.cohost_id as string | null) ?? null;
    if (!newHost) {
      const { data: candidate } = await adminClient
        .from('competition_members')
        .select('profile_id')
        .eq('competition_id', competition.id)
        .eq('status', 'active')
        .eq('role', 'competitor')
        .neq('profile_id', profileId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      newHost = (candidate?.profile_id as string | undefined) ?? null;
    }

    if (newHost) {
      await adminClient
        .from('competitions')
        .update({ host_id: newHost, cohost_id: null })
        .eq('id', competition.id);
      await createNotifications(adminClient, [{
        profileId: newHost,
        type: 'host_transferred',
        title: 'You are now the host',
        body: `The host of ${competition.name} deleted their account, so you are now the host.`,
        data: { competition_id: competition.id, href: `/competitions/${competition.id}/settings` },
      }]);
    } else {
      await adminClient.from('competitions').update({ status: 'archived' }).eq('id', competition.id);
    }
  }

  await adminClient.from('competitions').update({ cohost_id: null }).eq('cohost_id', profileId);
}

// Removes the person's own content and personal data, anonymises their profile so results and
// standings stay correct for everyone else, then soft-deletes the login so it can never be used.
export async function deleteAccount(adminClient: SupabaseClient, profileId: string): Promise<{ error: string | null }> {
  try {
    await handOverHostedCompetitions(adminClient, profileId);

    const steps = [
      adminClient.from('messages').delete().eq('sender_profile_id', profileId),
      adminClient.from('feed_comments').delete().eq('profile_id', profileId),
      adminClient.from('reactions').delete().eq('profile_id', profileId),
      adminClient.from('profile_follows').delete().or(`follower_id.eq.${profileId},following_id.eq.${profileId}`),
      adminClient.from('profile_blocks').delete().or(`blocker_id.eq.${profileId},blocked_id.eq.${profileId}`),
      adminClient.from('push_tokens').delete().eq('profile_id', profileId),
      adminClient.from('notifications').delete().eq('profile_id', profileId),
      adminClient.from('personal_bests').delete().eq('profile_id', profileId),
    ];
    for (const step of steps) {
      const { error } = await step;
      if (error) return { error: 'Your data could not be removed. Please try again.' };
    }

    // Leave any unfinished competitions; finished ones keep their final standings.
    const { data: memberships } = await adminClient
      .from('competition_members')
      .select('id, competitions(status)')
      .eq('profile_id', profileId)
      .eq('status', 'active');
    const unfinished = (memberships ?? [])
      .filter((row) => !['complete', 'archived'].includes(
        (row.competitions as unknown as { status: string } | null)?.status ?? '',
      ))
      .map((row) => row.id as string);
    if (unfinished.length > 0) {
      await adminClient.from('competition_members').update({ status: 'withdrawn' }).in('id', unfinished);
    }

    // Remove uploaded profile and evidence photos.
    for (const bucket of ['avatars', 'result-evidence']) {
      const { data: files } = await adminClient.storage.from(bucket).list(profileId);
      if (files && files.length > 0) {
        await adminClient.storage.from(bucket).remove(files.map((file) => `${profileId}/${file.name}`));
      }
    }

    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        display_name: DELETED_DISPLAY_NAME,
        avatar_url: null,
        bio: null,
        city: null,
        country_code: null,
        favourite_sport: null,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', profileId);
    if (profileError) return { error: 'Your profile could not be removed. Please try again.' };

    // Sign-up details (name, date of birth, country) live in the login's metadata; clear them first.
    await adminClient.auth.admin.updateUserById(profileId, {
      user_metadata: { display_name: null, date_of_birth: null, country_code: null },
    });

    // A soft delete keeps the anonymised row that results still point at, but the
    // login, email and identities are removed and cannot be restored.
    const { error: authError } = await adminClient.auth.admin.deleteUser(profileId, true);
    if (authError) return { error: 'Your login could not be removed. Please try again.' };

    return { error: null };
  } catch {
    return { error: 'Something went wrong while deleting your account.' };
  }
}
