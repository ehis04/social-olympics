// ConversationList — DM inbox with latest message per partner
'use client';

import Link from 'next/link';
import Image from 'next/image';
import ROUTES from '@/constants/routes';
import { useConversations } from '@/hooks/chat/useChat';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Conversation } from '@/types/social';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export function ConversationList() {
  const { user } = useAuth();
  const { data, isLoading } = useConversations();

  const conversations = (data?.pages.flatMap((p) => p.data) ?? []) as Conversation[];

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg p-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-grey-200" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 animate-pulse rounded bg-grey-200" />
              <div className="h-3 w-48 animate-pulse rounded bg-grey-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-10 text-center">
        <p className="text-sm text-grey-500">
          No messages yet. Visit a competitor&apos;s profile to start a conversation.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-grey-100 rounded-lg border border-grey-200 bg-white">
      {conversations.map((convo) => {
        const isOwn = convo.sender_profile_id === user?.id;
        const partner = isOwn ? convo.recipient : convo.sender;
        if (!partner) return null;

        return (
          <Link
            key={convo.id}
            href={ROUTES.MESSAGE_THREAD(partner.id)}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-grey-50"
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-grey-200">
              {partner.avatar_url ? (
                <Image src={partner.avatar_url} alt={partner.display_name} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-grey-500">
                  {partner.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-medium text-grey-900">{partner.display_name}</span>
                <span className="shrink-0 text-xs text-grey-400">{timeAgo(convo.created_at)}</span>
              </div>
              <p className="truncate text-sm text-grey-500">
                {isOwn && <span className="text-grey-400">You: </span>}
                {convo.content}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
