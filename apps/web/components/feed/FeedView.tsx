// FeedView — competition activity feed with realtime inserts and load-more
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createBrowserClient, subscribeFeed } from '@repo/supabase';
import { useFeed } from '@/hooks/feed/useFeed';
import { FeedItemCard } from './FeedItemCard';
import { isFeedItem } from '@/types/social';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competition: CompetitionRow;
}

export function FeedView({ competition }: Props) {
  const queryClient = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useFeed(competition.id);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const client = createBrowserClient();
    const unsubscribe = subscribeFeed(client, competition.id, (item) => {
      if (!isFeedItem(item)) return;
      void queryClient.invalidateQueries({ queryKey: ['competition', competition.id, 'feed'] });
    });
    return () => unsubscribe();
  }, [competition.id, queryClient]);

  const items = data?.pages.flatMap((p) => p.data) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-grey-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-10 text-center">
        <p className="text-sm text-grey-500">No activity yet. Results and events will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FeedItemCard key={item.id} item={item} />
      ))}

      {hasNextPage && (
        <div ref={bottomRef} className="flex justify-center pt-2">
          <button
            onClick={() => void fetchNextPage()}
            disabled={isFetchingNextPage}
            className="rounded-md border border-grey-200 px-4 py-2 text-sm font-medium text-grey-600 hover:bg-grey-50 disabled:opacity-50"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
