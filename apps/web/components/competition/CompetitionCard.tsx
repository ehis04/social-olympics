// Displays a single competition summary card; fully clickable to competition feed
import Link from 'next/link';
import { Users, Calendar } from 'lucide-react';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import { STATUS_COLOURS } from '@repo/constants';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competition: CompetitionRow;
  memberCount?: number;
  showJoinButton?: boolean;
  isJoined?: boolean;
  onJoin?: (id: string) => void;
}

export default function CompetitionCard({ competition, memberCount, showJoinButton, isJoined = false, onJoin }: Props) {
  const statusColour = STATUS_COLOURS[competition.status as keyof typeof STATUS_COLOURS] ?? 'bg-grey-100 text-grey-600';

  return (
    <div className="relative rounded-lg border border-grey-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={ROUTES.COMPETITION_FEED(competition.id)}
        className="block p-5"
        aria-label={`Open ${competition.name}`}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2 className="text-base font-bold text-grey-800 leading-tight line-clamp-2">
            {competition.name}
          </h2>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${statusColour}`}
          >
            {competition.status}
          </span>
        </div>

        {competition.description && (
          <p className="mb-3 text-sm text-grey-600 line-clamp-2">{competition.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-grey-500">
          {memberCount != null && (
            <span className="flex items-center gap-1">
              <Users size={13} />
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </span>
          )}
          {competition.total_events != null && (
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {competition.total_events} {competition.total_events === 1 ? 'event' : 'events'}
            </span>
          )}
          {competition.city && (
            <span className="truncate">
              {competition.city}
              {competition.country_code ? `, ${competition.country_code}` : ''}
            </span>
          )}
        </div>
      </Link>

      {showJoinButton && (
        <div className="border-t border-grey-100 px-5 py-3">
          {isJoined ? (
            <div className="w-full rounded bg-grey-100 px-3 py-1.5 text-center text-sm font-semibold text-grey-500">
              Joined
            </div>
          ) : (
            <button
              onClick={() => onJoin?.(competition.id)}
              className="w-full rounded bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
            >
              Join
            </button>
          )}
        </div>
      )}
    </div>
  );
}
