/*
 * This file defines the index module.
 */

// Messages inbox — list of DM conversations with latest message preview.
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
import { formatRelativeTime } from '@/utils/formatters/date';

interface ProfileSnippet {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

// The API returns the latest message of each conversation, with both people attached.
interface LatestMessage {
  sender_profile_id: string;
  recipient_profile_id: string;
  content: string;
  created_at: string;
  sender: ProfileSnippet | null;
  recipient: ProfileSnippet | null;
}

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastMessageAt: string;
  sentByMe: boolean;
}

// Renders the messages screen component.
export default function MessagesScreen() {
  const { profile } = useAuthStore();
  const router = useRouter();

  const { data, isLoading, refetch, isRefetching, error } = useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: async () => {
      const result = await apiCall<LatestMessage[]>('/api/messages');
      if (result.error) throw new Error(result.error.message);
      return (result.data ?? []).map((message): Conversation => {
        const sentByMe = message.sender_profile_id === profile?.id;
        const partner = sentByMe ? message.recipient : message.sender;
        return {
          partnerId: sentByMe ? message.recipient_profile_id : message.sender_profile_id,
          partnerName: partner?.display_name ?? 'Unknown',
          partnerAvatar: partner?.avatar_url ?? null,
          lastMessage: message.content,
          lastMessageAt: message.created_at,
          sentByMe,
        };
      });
    },
    enabled: !!profile?.id,
  });

  const conversations = data ?? [];

  function renderConversation({ item }: { item: Conversation }) {
    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-neutral-100 bg-white"
        onPress={() => router.push(MOBILE_ROUTES.MESSAGE_THREAD(item.partnerId))}
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
            <Text className="text-sm font-medium text-neutral-800">{item.partnerName}</Text>
            <Text className="text-xs text-neutral-400">{formatRelativeTime(item.lastMessageAt)}</Text>
          </View>
          <Text className="text-xs text-neutral-500 mt-0.5" numberOfLines={1}>
            {item.sentByMe ? `You: ${item.lastMessage}` : item.lastMessage}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-4 border-b border-neutral-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3" accessibilityLabel="Back">
          <ChevronLeft size={22} color="#6B7280" />
        </TouchableOpacity>
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
            <View className="items-center justify-center py-20 px-8">
              <Text className="text-2xl mb-3">💬</Text>
              <Text className="text-neutral-500 text-sm text-center">
                {error
                  ? 'Messages could not be loaded. Pull down to try again.'
                  : 'No conversations yet. Open someone’s profile and tap Message to start one.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
