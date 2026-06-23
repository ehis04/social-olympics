// Profile search page — find users and open their public profiles
import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@repo/supabase';
import { ProfileSearchForm } from '@/components/profile/ProfileSearchForm';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import type { Route } from 'next';

type ProfileRow = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'display_name' | 'avatar_url' | 'bio' | 'country_code'
>;

interface Props {
  searchParams?: Promise<{ q?: string }>;
}

function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

async function searchProfiles(q: string, currentUserId: string): Promise<ProfileRow[]> {
  const adminClient = createAdminClient();
  let query = adminClient
    .from('profiles')
    .select('id, display_name, avatar_url, bio, country_code')
    .eq('is_ghost', false)
    .neq('id', currentUserId)
    .order('display_name', { ascending: true })
    .limit(24);

  if (q) {
    const escaped = q.replaceAll('%', '\\%').replaceAll('_', '\\_');
    query = query.or(
      `display_name.ilike.%${escaped}%,bio.ilike.%${escaped}%,country_code.ilike.%${escaped}%`,
    );
  }

  const { data } = await query;
  return (data ?? []) as ProfileRow[];
}

export default async function ProfileSearchPage({ searchParams }: Props) {
  const client = await getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  if (!user) redirect(ROUTES.LOGIN as Route);

  const params = await searchParams;
  const q = params?.q?.trim() ?? '';
  const profiles = await searchProfiles(q, user.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-grey-900">People</h1>
        <p className="mt-1 text-sm text-grey-500">Find competitors, view profiles, and follow them.</p>
      </div>

      <ProfileSearchForm initialQuery={q} />

      {profiles.length === 0 ? (
        <div className="rounded-lg border border-grey-200 bg-white p-8 text-center">
          <h2 className="text-sm font-semibold text-grey-900">No profiles found</h2>
          <p className="mt-1 text-sm text-grey-500">Try another name, country, or keyword.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {profiles.map((profile) => {
            const flag = getFlagEmoji(profile.country_code);
            return (
              <Link
                key={profile.id}
                href={ROUTES.PROFILE(profile.id)}
                className="flex gap-3 rounded-lg border border-grey-200 bg-white p-4 transition-colors hover:border-primary hover:bg-primary-muted/30"
              >
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-grey-200">
                  {profile.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.display_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-lg font-bold text-grey-400">
                      {profile.display_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <h2 className="truncate text-sm font-semibold text-grey-900">
                      {profile.display_name}
                    </h2>
                    {flag && <span className="shrink-0 text-sm">{flag}</span>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-grey-500">
                    {profile.bio || 'No bio yet'}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
