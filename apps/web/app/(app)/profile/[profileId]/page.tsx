// Public profile page — view any competitor's profile and stats
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getProfile, getPersonalBests } from '@repo/supabase';
import { FollowButton } from '@/components/profile/FollowButton';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalBestsList } from '@/components/profile/PersonalBestsList';
import { ProfileSocialTabs } from '@/components/profile/ProfileSocialTabs';
import ROUTES from '@/constants/routes';
import type { ProfileWithStats, PersonalBest } from '@/types/profile';
import type { Route } from 'next';

interface Props {
  params: Promise<{ profileId: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const { profileId } = await params;
  const adminClient = createAdminClient();
  const [{ data: profileData }, { data: pbData }] = await Promise.all([
    getProfile(adminClient, profileId),
    getPersonalBests(adminClient, profileId),
  ]);

  if (!profileData) notFound();

  const profile = profileData as ProfileWithStats;
  const personalBests = (pbData ?? []) as PersonalBest[];
  const isOwnProfile = user.id === profileId;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-grey-900">Personal Bests</h2>
        {!isOwnProfile && (
          <div className="flex items-center gap-2">
            <FollowButton profileId={profileId} />
            <Link
              href={ROUTES.MESSAGE_THREAD(profileId)}
              className="rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50"
            >
              Message
            </Link>
          </div>
        )}
      </div>

      <PersonalBestsList personalBests={personalBests} />

      <ProfileSocialTabs profileId={profileId} />
    </div>
  );
}
