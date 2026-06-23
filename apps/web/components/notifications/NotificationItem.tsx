// NotificationItem — single notification row with read state
import Link from 'next/link';
import type { Route } from 'next';
import type { Notification } from '@/types/social';

interface Props {
  notification: Notification;
  onMarkRead: (id: string) => void;
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

function typeIcon(type: string): string {
  if (type.includes('medal') || type.includes('gold') || type.includes('silver') || type.includes('bronze')) return '🏅';
  if (type.includes('result')) return '✅';
  if (type.includes('dispute')) return '⚠️';
  if (type.includes('tiebreaker')) return '🔴';
  if (type.includes('mvp')) return '🏆';
  if (type.includes('message') || type.includes('dm')) return '💬';
  if (type.includes('joined')) return '👋';
  return '🔔';
}

function getStringValue(data: Record<string, unknown> | null, key: string): string | null {
  const value = data?.[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function getNotificationHref(notification: Notification): string | null {
  const directHref = getStringValue(notification.data, 'href');
  if (directHref?.startsWith('/')) return directHref;

  const senderProfileId = getStringValue(notification.data, 'sender_profile_id');
  if (senderProfileId) return `/messages/${senderProfileId}`;

  const followerProfileId = getStringValue(notification.data, 'follower_profile_id');
  if (followerProfileId) return `/profile/${followerProfileId}`;

  const competitionId = getStringValue(notification.data, 'competition_id');
  const competitionEventId = getStringValue(notification.data, 'competition_event_id');
  if (competitionId && competitionEventId) {
    return `/competitions/${competitionId}/events/${competitionEventId}`;
  }
  if (competitionId) return `/competitions/${competitionId}/feed`;

  return null;
}

export function NotificationItem({ notification, onMarkRead }: Props) {
  const isUnread = !notification.read_at;
  const href = getNotificationHref(notification);
  const className = [
    'flex items-start gap-3 px-4 py-3 transition-colors',
    href ? 'hover:bg-grey-50' : '',
    isUnread ? 'bg-primary-muted' : 'bg-white',
  ].join(' ');
  const content = (
    <>
      <span className="mt-0.5 text-xl">{typeIcon(notification.type)}</span>

      <div className="min-w-0 flex-1">
        <p className={`text-sm ${isUnread ? 'font-semibold text-grey-900' : 'font-medium text-grey-700'}`}>
          {notification.title}
        </p>
        {notification.body && (
          <p className="mt-0.5 text-sm text-grey-500">{notification.body}</p>
        )}
        <p className="mt-1 text-xs text-grey-400">{timeAgo(notification.created_at)}</p>
      </div>

      {isUnread && (
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />
      )}
    </>
  );

  function handleActivate() {
    if (isUnread) onMarkRead(notification.id);
  }

  if (href) {
    return (
      <Link href={href as Route} className={className} onClick={handleActivate}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={`${className} w-full text-left`} onClick={handleActivate}>
      {content}
    </button>
  );
}
