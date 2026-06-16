// ProfileHeader — avatar, name, bio, country, career medal summary
import Image from 'next/image';
import Link from 'next/link';
import ROUTES from '@/constants/routes';
import type { ProfileWithStats } from '@/types/profile';

interface Props {
  profile: ProfileWithStats;
  isOwnProfile: boolean;
}

function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const codePoints = code
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center rounded-lg bg-grey-50 px-4 py-3 text-center">
      <span className="text-lg font-bold text-grey-900">{value}</span>
      <span className="text-xs text-grey-500">{label}</span>
    </div>
  );
}

export function ProfileHeader({ profile, isOwnProfile }: Props) {
  const stats = profile.career_stats;
  const flag = getFlagEmoji(profile.country_code ?? null);

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-grey-200 ring-4 ring-white shadow">
          {profile.avatar_url ? (
            <Image
              src={profile.avatar_url}
              alt={profile.display_name}
              fill
              className="object-cover"
              priority
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-3xl font-bold text-grey-400">
              {profile.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 pt-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold text-grey-900">{profile.display_name}</h1>
            {flag && <span className="text-2xl">{flag}</span>}
          </div>

          {profile.bio && (
            <p className="mt-1 text-sm text-grey-600 line-clamp-3">{profile.bio}</p>
          )}

          {isOwnProfile && (
            <Link
              href={ROUTES.PROFILE_SETTINGS}
              className="mt-2 inline-flex items-center rounded-md border border-grey-200 bg-white px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50"
            >
              Edit profile
            </Link>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          <StatPill label="Competitions" value={stats.competitions_entered} />
          <StatPill label="Wins" value={stats.competitions_won} />
          <StatPill label="🥇 Gold" value={stats.gold_medals} />
          <StatPill label="🥈 Silver" value={stats.silver_medals} />
          <StatPill label="🥉 Bronze" value={stats.bronze_medals} />
          <StatPill label="Events" value={stats.events_competed} />
        </div>
      )}
    </div>
  );
}
