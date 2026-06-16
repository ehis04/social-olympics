// NotificationItem — single notification row with read state
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

export function NotificationItem({ notification, onMarkRead }: Props) {
  const isUnread = !notification.read_at;

  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 transition-colors',
        isUnread ? 'bg-primary-50' : 'bg-white',
      ].join(' ')}
      onClick={() => isUnread && onMarkRead(notification.id)}
      role={isUnread ? 'button' : undefined}
    >
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
        <div className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary-500" />
      )}
    </div>
  );
}
