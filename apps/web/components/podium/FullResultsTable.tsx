// FullResultsTable — all finishers ranked below the podium display
import Image from 'next/image';
import Link from 'next/link';
import ROUTES from '@/constants/routes';

interface Finisher {
  profile_id: string;
  final_rank: number | null;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  events_completed: number;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    country_code: string | null;
  } | null;
}

interface Props {
  finishers: Finisher[];
  currentUserId: string;
}

function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const pts = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

export function FullResultsTable({ finishers, currentUserId }: Props) {
  return (
    <div className="overflow-x-auto rounded-lg border border-grey-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-grey-200 bg-grey-50 text-left text-xs font-semibold uppercase tracking-wide text-grey-500">
            <th className="px-4 py-3 w-12">Rank</th>
            <th className="px-4 py-3">Competitor</th>
            <th className="px-4 py-3 text-right">Points</th>
            <th className="px-4 py-3 hidden sm:table-cell text-right">Events</th>
            <th className="px-4 py-3 hidden md:table-cell">Medals</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grey-100">
          {finishers.map((f) => {
            const isCurrentUser = f.profile_id === currentUserId;
            const displayName = f.profiles?.display_name ?? 'Unknown';
            const flag = getFlagEmoji(f.profiles?.country_code ?? null);

            return (
              <tr
                key={f.profile_id}
                className={[
                  'transition-colors hover:bg-grey-50',
                  isCurrentUser ? 'bg-primary-50' : '',
                ].join(' ')}
              >
                <td className="px-4 py-3 font-mono font-semibold text-grey-700">
                  {f.final_rank ?? '-'}
                </td>
                <td className="px-4 py-3">
                  <Link href={ROUTES.PROFILE(f.profile_id)} className="flex items-center gap-3 hover:underline">
                    <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-grey-200">
                      {f.profiles?.avatar_url ? (
                        <Image src={f.profiles.avatar_url} alt={displayName} fill className="object-cover" />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span className="font-medium text-grey-900">
                      {displayName}
                      {flag && <span className="ml-1.5">{flag}</span>}
                      {isCurrentUser && <span className="ml-1.5 text-xs text-primary-600">(you)</span>}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-grey-900">
                  {f.total_points}
                </td>
                <td className="px-4 py-3 text-right text-grey-600 hidden sm:table-cell">
                  {f.events_completed}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm">
                  {f.gold_count > 0 && `🥇${f.gold_count} `}
                  {f.silver_count > 0 && `🥈${f.silver_count} `}
                  {f.bronze_count > 0 && `🥉${f.bronze_count}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
