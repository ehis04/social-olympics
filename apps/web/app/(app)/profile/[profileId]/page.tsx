// Public profile page — view any competitor's profile and stats
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getServerClient } from '@/lib/supabase/server';
import { getProfile, getPersonalBests } from '@repo/supabase';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import { PersonalBestsList } from '@/components/profile/PersonalBestsList';
import ROUTES from '@/constants/routes';
import type { ProfileWithStats, PersonalBest } from '@/types/profile';
import type { Route } from 'next';

interface Props {
  params: { profileId: string };
}

export default async function ProfilePage({ params }: Props) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const [{ data: profileData }, { data: pbData }] = await Promise.all([
    getProfile(client, params.profileId),
    getPersonalBests(client, params.profileId),
  ]);

  if (!profileData) notFound();

  const profile = profileData as ProfileWithStats;
  const personalBests = (pbData ?? []) as PersonalBest[];
  const isOwnProfile = user.id === params.profileId;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <ProfileHeader profile={profile} isOwnProfile={isOwnProfile} />

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-grey-900">Personal Bests</h2>
        {!isOwnProfile && (
          <Link
            href={ROUTES.MESSAGE_THREAD(params.profileId)}
            className="rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50"
          >
            Message
          </Link>
        )}
      </div>

      <PersonalBestsList personalBests={personalBests} />
    </div>
  );
}
