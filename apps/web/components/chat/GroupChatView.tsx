// GroupChatView — live competition group chat with realtime updates
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createBrowserClient, subscribeGroupChat } from '@repo/supabase';
import { useGroupChat, useSendGroupMessage, useDeleteGroupMessage } from '@/hooks/chat/useChat';
import { useAuth } from '@/hooks/auth/useAuth';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MessageInput } from './MessageInput';
import { isChatMessage } from '@/types/social';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competition: CompetitionRow;
}

export function GroupChatView({ competition }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useGroupChat(competition.id);
  const { mutate: sendMessage, isPending: isSending } = useSendGroupMessage(competition.id);
  const { mutate: deleteMessage } = useDeleteGroupMessage(competition.id);
  const messages = [...(data?.pages.flatMap((p) => p.data) ?? [])].reverse();

  const isHost = user?.id === competition.host_id || user?.id === competition.cohost_id;

  useEffect(() => {
    const client = createBrowserClient();
    const unsubscribe = subscribeGroupChat(client, competition.id, (msg) => {
      if (!isChatMessage(msg)) return;
      void queryClient.invalidateQueries({ queryKey: ['competition', competition.id, 'chat'] });
    });
    return () => unsubscribe();
  }, [competition.id, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(content: string) {
    sendMessage(content, {
      onError: () => toast.error('Failed to send message'),
    });
  }

  function handleDelete(messageId: string) {
    deleteMessage(messageId, {
      onError: () => toast.error('Failed to delete message'),
    });
  }

  return (
    <div className="flex h-[60vh] flex-col rounded-lg border border-grey-200 bg-white">
      <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasNextPage && (
          <div className="flex justify-center pb-2">
            <button
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="rounded-md border border-grey-200 px-3 py-1.5 text-xs font-medium text-grey-500 hover:bg-grey-50 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <div className="h-7 w-7 animate-pulse rounded-full bg-grey-200" />
                <div className="h-9 w-48 animate-pulse rounded-2xl bg-grey-100" />
              </div>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_profile_id === user?.id}
            canDelete={msg.sender_profile_id === user?.id || isHost}
            onDelete={handleDelete}
          />
        ))}

        {messages.length === 0 && !isLoading && (
          <p className="text-center text-sm text-grey-400">No messages yet. Say hello!</p>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput onSend={handleSend} isSending={isSending} />
    </div>
  );
}
