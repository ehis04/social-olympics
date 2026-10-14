/*
 * This file defines the index module.
 */

// Competition feed screen — realtime activity feed with load-more pagination.
import { useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { subscribeFeed } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { FeedItemCard, type FeedComment, type FeedItem, type FeedReaction } from '@/components/feed/FeedItemCard';

// The API adds reactions and comments to each item, leaving out comments from blocked people.
type EnrichedFeedItem = FeedItem & { feed_comments?: FeedComment[]; reactions?: FeedReaction[] };

const NO_COMMENTS: FeedComment[] = [];
const NO_REACTIONS: FeedReaction[] = [];

// Renders the feed screen component.
export default function FeedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['competition', id, 'feed'],
      queryFn: async ({ pageParam }) => {
        const query = pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : '';
        const result = await apiCall<EnrichedFeedItem[]>(`/api/competitions/${id}/feed${query}`);
        if (result.error) throw new Error(result.error.message);
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

  const items = data?.pages.flatMap((p) => p.data ?? []) ?? [];

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
          <FeedItemCard
            item={item}
            competitionId={id}
            comments={item.feed_comments ?? NO_COMMENTS}
            reactions={item.reactions ?? NO_REACTIONS}
          />
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
