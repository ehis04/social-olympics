/*
 * This file renders the profileId application page.
 */

// Public profile page — view any competitor's profile and stats
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getProfile, getPersonalBests, getCompetitionHistory } from '@repo/supabase';
import { CompetitionHistory } from '@/components/profile/CompetitionHistory';
import { BlockButton } from '@/components/profile/BlockButton';
import { FollowButton } from '@/components/profile/FollowButton';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalBestsList } from '@/components/profile/PersonalBestsList';
import { ProfileSocialTabs } from '@/components/profile/ProfileSocialTabs';
import ROUTES from '@/constants/routes';
import { isBlockedBetween } from '@/lib/social/blocks';
import type { ProfileWithStats, PersonalBest } from '@/types/profile';
import type { Route } from 'next';

interface Props {
  params: Promise<{ profileId: string }>;
}

// Renders the profile page component.
export default async function ProfilePage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const { profileId } = await params;
  const adminClient = createAdminClient();
  const isOwnProfile = user.id === profileId;
  const [{ data: profileData }, { data: pbData }, historyResult, { data: ownBlock }, blockedEitherWay] = await Promise.all([
    getProfile(adminClient, profileId),
    getPersonalBests(adminClient, profileId),
    getCompetitionHistory(client, profileId),
    client.from('profile_blocks').select('blocked_id').eq('blocker_id', user.id).eq('blocked_id', profileId).maybeSingle(),
    isOwnProfile ? Promise.resolve(false) : isBlockedBetween(client, user.id, profileId),
  ]);

  if (!profileData) notFound();

  const profile = profileData as ProfileWithStats;
  const personalBests = (pbData ?? []) as PersonalBest[];
  const isDeleted = !!profile.deleted_at;
  // Guest profiles and deleted accounts have nobody behind them to follow or message.
  const canInteract = !isOwnProfile && !isDeleted && !profile.is_ghost;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-grey-900">Personal Bests</h2>
        {canInteract && (
          <div className="flex flex-wrap items-center gap-2">
            {!blockedEitherWay && <FollowButton profileId={profileId} />}
            {!blockedEitherWay && (
              <Link
                href={ROUTES.MESSAGE_THREAD(profileId)}
                className="rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50"
              >
                Message
              </Link>
            )}
            <BlockButton profileId={profileId} displayName={profile.display_name} initialBlocked={!!ownBlock} />
          </div>
        )}
      </div>
      {isDeleted && (
        <p className="rounded-lg bg-grey-50 px-4 py-3 text-sm text-grey-600">
          This account has been deleted. Their past results stay in the competitions they took part in.
        </p>
      )}

      <PersonalBestsList personalBests={personalBests} />
      {historyResult.error ? <p role="alert" className="text-sm text-red-600">Competition history could not be loaded. Refresh to try again.</p>
        : <CompetitionHistory history={historyResult.data ?? []} />}

      {!isDeleted && <ProfileSocialTabs profileId={profileId} />}
    </div>
  );
}
