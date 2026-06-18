// Competition feed screen — realtime activity feed with load-more pagination.
import { useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { getFeed, subscribeFeed } from '@repo/supabase';
import { FeedItemCard } from '@/components/feed/FeedItemCard';

interface FeedItem {
  id: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor: { id: string; display_name: string; avatar_url: string | null } | null;
  subject: { id: string; display_name: string; avatar_url: string | null } | null;
}

export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['competition', id, 'feed'],
      queryFn: async ({ pageParam }) => {
        const result = await getFeed(supabase, id, {
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
    const unsubscribe = subscribeFeed(supabase, id, () => {
      void queryClient.invalidateQueries({ queryKey: ['competition', id, 'feed'] });
    });
    return () => unsubscribe();
  }, [id, queryClient]);

  const items = data?.pages.flatMap((p) => (p.data as FeedItem[] | null) ?? []) ?? [];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pt-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
        renderItem={({ item }) => (
          <FeedItemCard item={item} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Text className="text-neutral-500 text-sm text-center">
                No activity yet. Results and events will appear here.
              </Text>
            </View>
          ) : (
            <View className="items-center py-10">
              <ActivityIndicator color="#2D6A4F" />
            </View>
          )
        }
        ListFooterComponent={
          hasNextPage ? (
            <TouchableOpacity
              className="items-center py-4"
              onPress={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              <Text className="text-sm font-medium text-primary">
                {isFetchingNextPage ? 'Loading…' : 'Load more'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
