// Notifications screen — list with type icons, unread highlight, mark-all-read.
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getNotifications, markNotificationsRead } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { formatRelativeTime } from '@/utils/formatters/date';
import { useRouter } from 'expo-router';

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  data: Record<string, unknown> | null;
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

export default function NotificationsScreen() {
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['notifications', profile?.id],
    queryFn: async () => {
      const result = await getNotifications(supabase, profile?.id ?? '');
      return (result.data ?? []) as NotificationRow[];
    },
    enabled: !!profile?.id,
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleMarkRead(id: string) {
    if (!profile?.id) return;
    await markNotificationsRead(supabase, profile.id, [id]);
    queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
  }

  async function handleMarkAllRead() {
    if (!profile?.id) return;
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await markNotificationsRead(supabase, profile.id, unreadIds);
    queryClient.invalidateQueries({ queryKey: ['notifications', profile?.id] });
  }

  function handleTap(notification: NotificationRow) {
    if (!notification.read_at) handleMarkRead(notification.id);
    const screen = notification.data?.screen as string | undefined;
    if (screen) router.push(screen as never);
  }

  function renderItem({ item }: { item: NotificationRow }) {
    const isUnread = !item.read_at;
    return (
      <TouchableOpacity
        className={`flex-row items-start gap-3 px-4 py-3 border-b border-neutral-100 ${
          isUnread ? 'bg-primary-muted/30' : 'bg-white'
        }`}
        onPress={() => handleTap(item)}
        activeOpacity={0.7}
      >
        <Text className="text-xl mt-0.5">{typeIcon(item.type)}</Text>
        <View className="flex-1 min-w-0">
          <Text
            className={`text-sm ${isUnread ? 'font-semibold text-neutral-900' : 'font-medium text-neutral-700'}`}
          >
            {item.title}
          </Text>
          {item.body ? (
            <Text className="text-sm text-neutral-500 mt-0.5" numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
          <Text className="text-xs text-neutral-400 mt-1">
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
        {isUnread && (
          <View className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-4 border-b border-neutral-200">
        <Text className="text-xl font-bold text-neutral-800">Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text className="text-sm text-primary font-semibold">Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-4xl mb-3">🔔</Text>
              <Text className="text-neutral-500 text-sm">No notifications yet</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
