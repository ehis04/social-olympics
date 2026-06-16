// Notifications page — full notification list with mark-read
'use client';

import { useEffect } from 'react';
import { useNotifications, useMarkNotificationsRead } from '@/hooks/notifications/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function NotificationsPage() {
  const { data: notifications = [], isLoading } = useNotifications();
  const { mutate: markRead } = useMarkNotificationsRead();

  const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);

  function handleMarkAll() {
    if (unreadIds.length > 0) markRead(unreadIds);
  }

  function handleMarkOne(id: string) {
    markRead([id]);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="h-7 w-40 animate-pulse rounded bg-grey-200" />
        <div className="divide-y divide-grey-100 rounded-lg border border-grey-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <div className="h-6 w-6 animate-pulse rounded-full bg-grey-200" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-48 animate-pulse rounded bg-grey-200" />
                <div className="h-3 w-32 animate-pulse rounded bg-grey-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-grey-900">Notifications</h1>
        {unreadIds.length > 0 && (
          <button
            onClick={handleMarkAll}
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-10 text-center">
          <p className="text-sm text-grey-500">You&apos;re all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-grey-100 overflow-hidden rounded-lg border border-grey-200">
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onMarkRead={handleMarkOne} />
          ))}
        </div>
      )}
    </div>
  );
}
