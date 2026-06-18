// Messages inbox — list of DM conversations with latest message preview.
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import { getConversations } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
import { formatRelativeTime } from '@/utils/formatters/date';

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export default function MessagesScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: async () => {
      const { data } = await getConversations(supabase, profile?.id ?? '');
      return (data ?? []) as Conversation[];
    },
    enabled: !!profile?.id,
  });

  const conversations = data ?? [];

  function renderConversation({ item }: { item: Conversation }) {
    const conversationId = [profile?.id ?? '', item.partnerId].sort().join('_');
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-neutral-100 bg-white"
        onPress={() => router.push(MOBILE_ROUTES.MESSAGE_THREAD(conversationId))}
        activeOpacity={0.7}
      >
        <View className="w-11 h-11 rounded-full bg-neutral-200 overflow-hidden mr-3">
          {item.partnerAvatar ? (
            <Image source={{ uri: item.partnerAvatar }} style={{ width: 44, height: 44 }} />
          ) : (
            <View className="w-11 h-11 rounded-full bg-primary-muted items-center justify-center">
              <Text className="text-sm font-bold text-primary">
                {(item.partnerName[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center justify-between">
            <Text className={`text-sm ${item.unreadCount > 0 ? 'font-bold text-neutral-900' : 'font-medium text-neutral-800'}`}>
              {item.partnerName}
            </Text>
            {item.lastMessageAt && (
              <Text className="text-xs text-neutral-400">
                {formatRelativeTime(item.lastMessageAt)}
              </Text>
            )}
          </View>
          {item.lastMessage && (
            <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
              {item.lastMessage}
            </Text>
          )}
        </View>
        {item.unreadCount > 0 && (
          <View className="w-5 h-5 rounded-full bg-primary items-center justify-center ml-2">
            <Text className="text-xs font-bold text-white">{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-4 py-4 border-b border-neutral-200">
        <Text className="text-xl font-bold text-neutral-800">Messages</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2D6A4F" />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.partnerId}
          renderItem={renderConversation}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
          }
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Text className="text-2xl mb-3">💬</Text>
              <Text className="text-neutral-500 text-sm">No conversations yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
