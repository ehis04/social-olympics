// Group chat screen — realtime messages, inverted list, keyboard-avoiding input.
import { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Send } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getGroupChat, subscribeGroupChat, sendMessage, deleteMessage } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { formatRelativeTime } from '@/utils/formatters/date';

interface ChatMessage {
  id: string;
  content: string;
  created_at: string;
  sender_profile_id: string;
  deleted_at: string | null;
  sender: { id: string; display_name: string; avatar_url: string | null } | null;
}

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ['competition', id, 'chat'],
      queryFn: async ({ pageParam }) => {
        const result = await getGroupChat(supabase, id, {
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
    const unsubscribe = subscribeGroupChat(supabase, id, () => {
      void queryClient.invalidateQueries({ queryKey: ['competition', id, 'chat'] });
    });
    return () => unsubscribe();
  }, [id, queryClient]);

  // Messages arrive newest-first from query, reverse for display (newest at bottom)
  const allMessages = data?.pages.flatMap((p) => (p.data as ChatMessage[] | null) ?? []) ?? [];
  const messages = [...allMessages].reverse();

  async function handleSend() {
    const trimmed = messageText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setMessageText('');
    await sendMessage(supabase, {
      competition_id: id,
      sender_profile_id: profile?.id ?? '',
      content: trimmed,
      message_type: 'group_chat',
    });
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ['competition', id, 'chat'] });
  }

  function confirmDelete(messageId: string) {
    Alert.alert('Delete message', 'Delete this message?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMessage(supabase, messageId);
          queryClient.invalidateQueries({ queryKey: ['competition', id, 'chat'] });
        },
      },
    ]);
  }

  function renderMessage({ item }: { item: ChatMessage }) {
    const isOwn = item.sender_profile_id === profile?.id;
    const displayName = item.sender?.display_name ?? 'Unknown';
    const avatarUrl = item.sender?.avatar_url ?? null;

    return (
      <TouchableOpacity
        onLongPress={() => isOwn && confirmDelete(item.id)}
        activeOpacity={isOwn ? 0.7 : 1}
      >
        <View className={`flex-row items-end gap-2 mb-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
          {!isOwn && (
            <View className="w-7 h-7 rounded-full bg-neutral-200 overflow-hidden">
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={{ width: 28, height: 28 }} />
              ) : (
                <View className="w-7 h-7 rounded-full bg-primary-muted items-center justify-center">
                  <Text className="text-xs font-bold text-primary">
                    {(displayName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          )}
          <View className={`max-w-[75%] ${isOwn ? 'items-end' : 'items-start'}`}>
            {!isOwn && (
              <Text className="text-xs text-neutral-500 mb-0.5 ml-1">{displayName}</Text>
            )}
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-4 pt-4 pb-2"
          inverted={false}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.2}
          ListHeaderComponent={
            hasNextPage ? (
              <TouchableOpacity
                className="items-center py-3"
                onPress={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                <Text className="text-xs text-primary font-medium">
                  {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
                </Text>
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

        {/* Message input */}
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
