// FeedItemCard — renders a single activity feed entry with actor and action text
import Image from 'next/image';
import Link from 'next/link';
import ROUTES from '@/constants/routes';
import type { FeedItem } from '@/types/social';

interface Props {
  item: FeedItem;
}

function formatActivityType(type: string, metadata: Record<string, unknown> | null): string {
  const eventName = typeof metadata?.event_name === 'string' ? metadata.event_name : 'an event';
  const place = typeof metadata?.place === 'number' ? metadata.place : null;

  switch (type) {
    case 'result_confirmed': return `confirmed a result in ${eventName}`;
    case 'event_started': return `started ${eventName}`;
    case 'event_completed': return `completed ${eventName}`;
    case 'member_joined': return 'joined the competition';
    case 'gold_medal': return `won gold 🥇 in ${eventName}`;
    case 'silver_medal': return `won silver 🥈 in ${eventName}`;
    case 'bronze_medal': return `won bronze 🥉 in ${eventName}`;
    case 'personal_best': return `set a personal best in ${eventName}`;
    case 'dispute_raised': return `raised a dispute in ${eventName}`;
    case 'dispute_resolved': return `resolved a dispute in ${eventName}`;
    case 'tiebreaker_initiated': return 'initiated a tiebreaker';
    case 'mvp_awarded': return 'was awarded MVP 🏆';
    default: return type.replace(/_/g, ' ');
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ profile, size = 8 }: { profile: FeedItem['actor']; size?: number }) {
  if (!profile) return null;
  const initials = profile.display_name.charAt(0).toUpperCase();
  const sizeClass = `h-${size} w-${size}`;

  return (
    <div className={`relative ${sizeClass} shrink-0 overflow-hidden rounded-full bg-grey-200`}>
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
          {initials}
        </span>
      )}
    </div>
  );
}

export function FeedItemCard({ item }: Props) {
  const actor = item.actor;
  const subject = item.subject;
  const action = formatActivityType(item.activity_type, item.metadata);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-grey-100 bg-white p-4 shadow-sm">
      {actor ? (
        <Link href={ROUTES.PROFILE(actor.id)}>
          <Avatar profile={actor} size={9} />
        </Link>
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg">
          🏅
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm text-grey-700">
          {actor && (
            <Link href={ROUTES.PROFILE(actor.id)} className="font-semibold text-grey-900 hover:underline">
              {actor.display_name}
            </Link>
          )}{' '}
          <span>{action}</span>
          {subject && subject.id !== actor?.id && (
            <>
              {' '}against{' '}
              <Link href={ROUTES.PROFILE(subject.id)} className="font-semibold text-grey-900 hover:underline">
                {subject.display_name}
              </Link>
            </>
          )}
        </p>
        <p className="mt-0.5 text-xs text-grey-400">{timeAgo(item.created_at)}</p>
      </div>
    </div>
  );
}
