// TanStack Query hooks for competition activity feed
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import type { FeedItem } from '@/types/social';

interface FeedPage {
  data: FeedItem[];
  hasMore: boolean;
  nextCursor?: string;
}

async function fetchFeedPage(competitionId: string, cursor?: string): Promise<FeedPage> {
  const params = new URLSearchParams({ limit: '20' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`/api/competitions/${competitionId}/feed?${params}`);
  if (!res.ok) throw new Error('Failed to fetch feed');
  return res.json() as Promise<FeedPage>;
}

export function useFeed(competitionId: string | undefined) {
  const { session } = useAuth();

  return useInfiniteQuery({
    queryKey: ['competition', competitionId, 'feed'],
    queryFn: ({ pageParam }) => fetchFeedPage(competitionId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!session && !!competitionId,
    staleTime: 15_000,
  });
}
