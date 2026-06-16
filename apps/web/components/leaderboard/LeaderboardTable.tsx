// LeaderboardTable — renders ranked competitor rows with medals and status
import Image from 'next/image';
import type { Route } from 'next';
import Link from 'next/link';
import { MedalTally } from './MedalTally';
import type { RankedMember } from '@/hooks/leaderboard/useLeaderboard';

interface Props {
  entries: RankedMember[];
  currentUserId: string;
}

function formatPoints(points: number): string {
  if (Number.isInteger(points)) return points.toString();
  return points.toFixed(1);
}

function getFlagEmoji(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function LeaderboardTable({ entries, currentUserId }: Props) {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-10 text-center">
        <p className="text-sm text-grey-500">No results yet. Check back after events are confirmed.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-grey-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-grey-200 bg-grey-50 text-left text-xs font-semibold uppercase tracking-wide text-grey-500">
            <th className="px-4 py-3 w-12">Rank</th>
            <th className="px-4 py-3">Competitor</th>
            <th className="px-4 py-3 text-right">Points</th>
            <th className="px-4 py-3 text-right hidden sm:table-cell">Events</th>
            <th className="px-4 py-3 hidden md:table-cell">Medals</th>
            <th className="px-4 py-3 hidden lg:table-cell">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {entries.map((entry) => {
            const isCurrentUser = entry.profile_id === currentUserId;
            const displayName = entry.profiles?.display_name ?? 'Unknown';
            const avatarUrl = entry.profiles?.avatar_url ?? null;
            const flag = getFlagEmoji(entry.profiles?.country_code ?? null);

            return (
              <tr
                key={entry.profile_id}
                className={[
                  'transition-colors hover:bg-grey-50',
                  isCurrentUser ? 'bg-primary-50' : '',
                  entry.isTied ? 'bg-amber-50 hover:bg-amber-100' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <td className="px-4 py-3">
                  <span className="font-mono text-sm font-semibold text-grey-700">
                    {entry.isTied && <span className="mr-0.5 text-amber-500">=</span>}
                    {entry.rank}
                  </span>
                </td>

                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${entry.profile_id}` as Route}
                    className="flex items-center gap-3 hover:underline"
                  >
                    <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-grey-200">
                      {avatarUrl ? (
                        <Image
                          src={avatarUrl}
                          alt={displayName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-grey-900">
                      {displayName}
                      {flag && <span className="ml-1.5 text-base">{flag}</span>}
                      {isCurrentUser && (
                        <span className="ml-1.5 text-xs text-primary-600">(you)</span>
                      )}
                    </span>
                  </Link>
                </td>

                <td className="px-4 py-3 text-right">
                  <span className="font-mono font-semibold text-grey-900">
                    {formatPoints(entry.total_points ?? 0)}
                  </span>
                </td>

                <td className="px-4 py-3 text-right hidden sm:table-cell text-grey-600">
                  {entry.events_completed ?? 0}
                </td>

                <td className="px-4 py-3 hidden md:table-cell">
                  <MedalTally
                    gold={entry.gold_count ?? 0}
                    silver={entry.silver_count ?? 0}
                    bronze={entry.bronze_count ?? 0}
                  />
                </td>

                <td className="px-4 py-3 hidden lg:table-cell">
                  {entry.isTied && (
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Tiebreaker pending
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}