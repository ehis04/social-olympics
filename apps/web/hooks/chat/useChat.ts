/*
 * This file provides the useChat React hook.
 */

// TanStack Query hooks for group chat and direct messages
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import type { ChatMessage, Conversation } from '@/types/social';

interface MessagesPage {
  data: ChatMessage[];
  hasMore: boolean;
  nextCursor?: string;
}

// ─── Group Chat ───────────────────────────────────────────────────────────────

async function fetchGroupChatPage(competitionId: string, cursor?: string): Promise<MessagesPage> {
  const params = new URLSearchParams({ limit: '30' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`/api/competitions/${competitionId}/chat?${params}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json() as Promise<MessagesPage>;
}

// Provides the use group chat hook.
export function useGroupChat(competitionId: string | undefined) {
  const { session } = useAuth();

  return useInfiniteQuery({
    queryKey: ['competition', competitionId, 'chat'],
    queryFn: ({ pageParam }) => fetchGroupChatPage(competitionId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!session && !!competitionId,
    staleTime: 0,
    refetchInterval: 3_000,
  });
}

// Provides the use send group message hook.
export function useSendGroupMessage(competitionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/competitions/${competitionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(getApiErrorMessage(await readJson(res), 'Failed to send message'));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'chat'] });
    },
  });
}

// Provides the use delete group message hook.
export function useDeleteGroupMessage(competitionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch(`/api/competitions/${competitionId}/chat`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error('Failed to delete message');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'chat'] });
    },
  });
}

// ─── Direct Messages ──────────────────────────────────────────────────────────

async function fetchDMPage(partnerId: string, cursor?: string): Promise<MessagesPage> {
  const params = new URLSearchParams({ partnerId, limit: '30' });
  if (cursor) params.set('cursor', cursor);
  const res = await fetch(`/api/messages?${params}`);
  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json() as Promise<MessagesPage>;
}

// Provides the use direct messages hook.
export function useDirectMessages(partnerId: string | undefined) {
  const { session } = useAuth();

  return useInfiniteQuery({
    queryKey: ['dm', partnerId],
    queryFn: ({ pageParam }) => fetchDMPage(partnerId!, pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    enabled: !!session && !!partnerId,
    staleTime: 0,
    refetchInterval: 3_000,
  });
}

// Provides the use send dm hook.
export function useSendDM(partnerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: partnerId, content }),
      });
      if (!res.ok) throw new Error(getApiErrorMessage(await readJson(res), 'Failed to send message'));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dm', partnerId] });
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

// Provides the use delete dm hook.
export function useDeleteDM(partnerId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await fetch('/api/messages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      });
      if (!res.ok) throw new Error('Failed to delete message');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dm', partnerId] });
    },
  });
}

// ─── Conversations list ───────────────────────────────────────────────────────

async function fetchConversations(): Promise<{ data: Conversation[] }> {
  const res = await fetch('/api/messages');
  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json() as Promise<{ data: Conversation[] }>;
}

// Provides the use conversations hook.
export function useConversations() {
  const { session } = useAuth();

  return useInfiniteQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const result = await fetchConversations();
      return { data: result.data, hasMore: false };
    },
    initialPageParam: undefined as undefined,
    getNextPageParam: () => undefined,
    enabled: !!session,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}
