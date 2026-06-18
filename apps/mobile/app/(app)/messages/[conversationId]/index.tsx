// DM thread — realtime direct messages between two users.
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronLeft, Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getDirectMessages, subscribeDirectMessages, sendMessage, deleteMessage, getProfile } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { formatRelativeTime } from '@/utils/formatters/date';
import { useQuery } from '@tanstack/react-query';
import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface DMMessage {
  id: string;
  content: string;
  created_at: string;
  sender_profile_id: string;
  recipient_profile_id: string;
  deleted_at: string | null;
  sender: { id: string; display_name: string; avatar_url: string | null } | null;
}

export default function MessageThreadScreen() {
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);

  // conversationId is "{idA}_{idB}" sorted alphabetically
  const [idA, idB] = conversationId.split('_') as [string, string];
  const partnerId = idA === profile?.id ? idB : idA;

  const { data: partnerData } = useQuery({
    queryKey: ['profile', partnerId],
    queryFn: async () => {
      const { data } = await getProfile(supabase, partnerId);
      return data as ProfileRow | null;
    },
    enabled: !!partnerId,
  });

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['dm', conversationId],
      queryFn: async ({ pageParam }) => {
        const result = await getDirectMessages(supabase, idA, idB, {
          ...(pageParam ? { cursor: pageParam as string } : {}),
        });
        return result;
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) =>
        (lastPage as { hasMore: boolean; nextCursor?: string }).hasMore
          ? (lastPage as { nextCursor?: string }).nextCursor
          : undefined,
    });

  useEffect(() => {
    const unsubscribe = subscribeDirectMessages(supabase, idA, idB, () => {
      void queryClient.invalidateQueries({ queryKey: ['dm', conversationId] });
    });
    return () => unsubscribe();
  }, [idA, idB, conversationId, queryClient]);

  const allMessages = data?.pages.flatMap((p) => (p.data as DMMessage[] | null) ?? []) ?? [];
  const messages = [...allMessages].reverse();

  async function handleSend() {
    const trimmed = messageText.trim();
    if (!trimmed || sending || !profile?.id) return;
    setSending(true);
    setMessageText('');
    await sendMessage(supabase, {
      sender_profile_id: profile.id,
      recipient_profile_id: partnerId,
      content: trimmed,
      message_type: 'direct_message',
    });
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ['dm', conversationId] });
  }

  function confirmDelete(messageId: string) {
    Alert.alert('Delete message', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMessage(supabase, messageId);
          queryClient.invalidateQueries({ queryKey: ['dm', conversationId] });
        },
      },
    ]);
  }

  function renderMessage({ item }: { item: DMMessage }) {
    const isOwn = item.sender_profile_id === profile?.id;
    return (
      <TouchableOpacity
        onLongPress={() => isOwn && confirmDelete(item.id)}
        activeOpacity={isOwn ? 0.7 : 1}
      >
        <View className={`flex-row items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {!isOwn && (
            <View className="w-7 h-7 rounded-full bg-neutral-200 overflow-hidden">
              {partnerData?.avatar_url ? (
                <Image source={{ uri: partnerData.avatar_url }} style={{ width: 28, height: 28 }} />
              ) : (
                <View className="w-7 h-7 rounded-full bg-primary-muted items-center justify-center">
                  <Text className="text-xs font-bold text-primary">
                    {(partnerData?.display_name?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
            <View
              className={`rounded-2xl px-3 py-2 ${
                isOwn ? 'bg-primary rounded-br-sm' : 'bg-neutral-100 rounded-bl-sm'
              }`}
            >
              <Text className={`text-sm ${isOwn ? 'text-white' : 'text-neutral-800'}`}>
                {item.content}
              </Text>
            </View>
            <Text className="text-xs text-neutral-400 mt-0.5 mx-1">
              {formatRelativeTime(item.created_at)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <ChevronLeft size={22} color="#6B7280" />
        </TouchableOpacity>
        <View className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden mr-2">
          {partnerData?.avatar_url ? (
            <Image source={{ uri: partnerData.avatar_url }} style={{ width: 32, height: 32 }} />
          ) : (
            <View className="w-8 h-8 rounded-full bg-primary-muted items-center justify-center">
              <Text className="text-xs font-bold text-primary">
                {(partnerData?.display_name?.[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text className="text-base font-semibold text-neutral-800">
          {partnerData?.display_name ?? '…'}
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-2"
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.2}
          ListHeaderComponent={
            hasNextPage ? (
              <TouchableOpacity
                className="items-center py-3"
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <Text className="text-xs text-primary font-medium">Load earlier</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center py-10">
                <Text className="text-neutral-400 text-sm">No messages yet. Say hello!</Text>
              </View>
            ) : (
              <View className="items-center py-10">
                <ActivityIndicator color="#2D6A4F" />
              </View>
            )
          }
          renderItem={renderMessage}
        />

        <View className="flex-row items-end gap-2 border-t border-neutral-200 bg-white px-4 py-3">
          <TextInput
            className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-900"
            placeholder="Send a message…"
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={1000}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            className="w-10 h-10 rounded-xl bg-primary items-center justify-center"
            onPress={handleSend}
            disabled={!messageText.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Send size={16} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
