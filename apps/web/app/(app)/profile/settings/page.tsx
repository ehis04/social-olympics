// Profile settings page — edit own profile details and avatar
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getProfile } from '@repo/supabase';
import { AvatarUpload } from '@/components/profile/AvatarUpload';
import { ProfileSettingsForm } from '@/components/profile/ProfileSettingsForm';
import ROUTES from '@/constants/routes';
import type { ProfileRow } from '@/types/profile';
import type { Route } from 'next';

export default async function ProfileSettingsPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const { data: profileData } = await getProfile(client, user.id);
  if (!profileData) redirect(ROUTES.DASHBOARD as Route);

  const profile = profileData as ProfileRow;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-grey-900">Profile settings</h1>
        <p className="mt-1 text-sm text-grey-500">Update your public profile information.</p>
      </div>

      <AvatarUpload
        currentUrl={profile.avatar_url ?? null}
        displayName={profile.display_name}
      />

      <div className="rounded-lg border border-grey-200 bg-white p-6">
        <ProfileSettingsForm profile={profile} />
      </div>
    </div>
  );
}
