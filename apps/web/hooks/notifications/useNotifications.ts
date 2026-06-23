// TanStack Query hooks for notifications
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Notification } from '@/types/social';

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch('/api/notifications');
  if (!res.ok) throw new Error('Failed to fetch notifications');
  const json = await res.json() as { data: Notification[] };
  return json.data;
}

export function useNotifications() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    enabled: !!session,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useUnreadNotificationCount() {
  const { data = [] } = useNotifications();
  return data.filter((notification) => !notification.read_at).length;
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to mark notifications read');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
