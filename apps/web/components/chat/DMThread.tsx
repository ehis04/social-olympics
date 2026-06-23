// DMThread — direct message thread with realtime and infinite scroll
'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createBrowserClient, subscribeDirectMessages } from '@repo/supabase';
import { useDirectMessages, useSendDM, useDeleteDM } from '@/hooks/chat/useChat';
import { useAuth } from '@/hooks/auth/useAuth';
import { ChatMessageBubble } from './ChatMessageBubble';
import { MessageInput } from './MessageInput';
import { isChatMessage } from '@/types/social';
import { toast } from '@/lib/toast';
import type { ProfileSnippet } from '@/types/social';

interface Props {
  partnerId: string;
  partner: ProfileSnippet;
}

export function DMThread({ partnerId, partner }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useDirectMessages(partnerId);
  const { mutate: sendDM, isPending: isSending } = useSendDM(partnerId);
  const { mutate: deleteDM } = useDeleteDM(partnerId);
  const messages = [...(data?.pages.flatMap((p) => p.data) ?? [])].reverse();

  useEffect(() => {
    if (!user?.id) return;
    const client = createBrowserClient();
    const unsubscribe = subscribeDirectMessages(client, user.id, partnerId, (msg) => {
      if (!isChatMessage(msg)) return;
      void queryClient.invalidateQueries({ queryKey: ['dm', partnerId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => unsubscribe();
  }, [user?.id, partnerId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(content: string) {
    sendDM(content, { onError: () => toast.error('Failed to send message') });
  }

  return (
    <div className="flex h-[65vh] flex-col rounded-lg border border-grey-200 bg-white">
      <div className="flex items-center gap-3 border-b border-grey-200 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-grey-200 text-sm font-semibold text-grey-600">
          {partner.display_name.charAt(0).toUpperCase()}
        </div>
        <span className="font-medium text-grey-900">{partner.display_name}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {hasNextPage && (
          <div className="flex justify-center pb-2">
            <button
              onClick={() => void fetchNextPage()}
              disabled={isFetchingNextPage}
              className="rounded-md border border-grey-200 px-3 py-1.5 text-xs font-medium text-grey-500 hover:bg-grey-50 disabled:opacity-50"
            >
              {isFetchingNextPage ? 'Loading…' : 'Load earlier'}
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex gap-2 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
                <div className="h-7 w-7 animate-pulse rounded-full bg-grey-200" />
                <div className="h-9 w-40 animate-pulse rounded-2xl bg-grey-100" />
              </div>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessageBubble
            key={msg.id}
            message={msg}
            isOwn={msg.sender_profile_id === user?.id}
            canDelete={msg.sender_profile_id === user?.id}
            onDelete={() => deleteDM(msg.id)}
          />
        ))}

        {messages.length === 0 && !isLoading && (
          <p className="text-center text-sm text-grey-400">
            No messages yet. Start the conversation!
          </p>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput
        onSend={handleSend}
        isSending={isSending}
        placeholder={`Message ${partner.display_name}…`}
      />
    </div>
  );
}
