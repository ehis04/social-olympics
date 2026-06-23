'use client';

// FeedItemCard — activity feed entry with inline reactions, collapsible comments, and report button
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle, Send } from 'lucide-react';
import ROUTES from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from '@/lib/toast';
import { ReportButton } from '@/components/moderation/ReportButton';
import type { FeedItem, FeedComment, FeedReaction } from '@/types/social';

interface Props {
  item: FeedItem;
  competitionId?: string;
  comments?: FeedComment[];
  reactions?: FeedReaction[];
}

const REACTION_EMOJIS = ['👏', '🔥', '🥇', '😂', '😮'];

function formatActivityType(type: string, metadata: Record<string, unknown> | null): string {
  const eventName = typeof metadata?.event_name === 'string' ? metadata.event_name : 'an event';

  switch (type) {
    case 'result_confirmed': return `confirmed a result in ${eventName}`;
    case 'event_started': return `started ${eventName}`;
    case 'event_completed': return `completed ${eventName}`;
    case 'member_joined': return 'joined the competition';
    case 'gold_medal': return `won gold 🥇 in ${eventName}`;
    case 'silver_medal': return `won silver 🥈 in ${eventName}`;
    case 'bronze_medal': return `won bronze 🥉 in ${eventName}`;
    case 'personal_best': return `set a personal best in ${eventName}`;
    case 'dispute_raised': return `raised a dispute in ${eventName}`;
    case 'dispute_resolved': return `resolved a dispute in ${eventName}`;
    case 'tiebreaker_initiated': return 'initiated a tiebreaker';
    case 'mvp_awarded': return 'was awarded MVP 🏆';
    default: return type.replace(/_/g, ' ');
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function SmallAvatar({ profile }: { profile: { display_name: string; avatar_url: string | null } }) {
  return (
    <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-grey-200">
      {profile.avatar_url ? (
        <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
          {profile.display_name.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function FeedItemCard({ item, competitionId, comments: initialComments = [], reactions: initialReactions = [] }: Props) {
  const { user } = useAuth();
  const actor = item.actor;
  const subject = item.subject;
  const action = formatActivityType(item.activity_type, item.metadata);

  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(initialComments);
  const [reactions, setReactions] = useState<FeedReaction[]>(initialReactions);
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

  async function handleReaction(emoji: string) {
    if (!user) return;
    setReactingEmoji(emoji);

    const existing = reactions.find((r) => r.emoji === emoji);
    const alreadyReacted = existing?.reactedByMe ?? false;

    try {
      const method = alreadyReacted ? 'DELETE' : 'POST';
      const res = await fetch(`/api/feed/${item.id}/reactions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error?.message ?? 'Failed to update reaction');
        return;
      }

      setReactions((prev) => {
        const updated = prev.filter((r) => r.emoji !== emoji);
        if (!alreadyReacted) {
          updated.push({ emoji, count: (existing?.count ?? 0) + 1, reactedByMe: true });
        } else if (existing && existing.count > 1) {
          updated.push({ emoji, count: existing.count - 1, reactedByMe: false });
        }
        return updated.sort((a, b) => b.count - a.count);
      });
    } catch {
      toast.error('Something went wrong');
    } finally {
      setReactingEmoji(null);
    }
  }

  async function handleComment() {
    if (!commentText.trim() || !user) return;
    setIsPosting(true);

    try {
      const res = await fetch(`/api/feed/${item.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to post comment');
        return;
      }

      const newComment = json.data as FeedComment;
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsPosting(false);
    }
  }

  const activeReactions = reactions.filter((r) => r.count > 0);
  const isOwnItem = actor?.id === user?.id;

  return (
    <div className="rounded-lg border border-grey-100 bg-white shadow-sm">
      {/* Main feed item */}
      <div className="flex items-start gap-3 p-4">
        {actor ? (
          <Link href={ROUTES.PROFILE(actor.id)}>
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-grey-200">
              {actor.avatar_url ? (
                <Image src={actor.avatar_url} alt={actor.display_name} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
                  {actor.display_name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </Link>
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg">
            🏅
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm text-grey-700">
            {actor && (
              <Link href={ROUTES.PROFILE(actor.id)} className="font-semibold text-grey-900 hover:underline">
                {actor.display_name}
              </Link>
            )}{' '}
            <span>{action}</span>
            {subject && subject.id !== actor?.id && (
              <>
                {' '}against{' '}
                <Link href={ROUTES.PROFILE(subject.id)} className="font-semibold text-grey-900 hover:underline">
                  {subject.display_name}
                </Link>
              </>
            )}
          </p>
          <p className="mt-0.5 text-xs text-grey-400">{timeAgo(item.created_at)}</p>
        </div>

        {!isOwnItem && (
          <ReportButton
            targetType="feed_item"
            targetId={item.id}
            {...(competitionId ? { competitionId } : {})}
          />
        )}
      </div>

      {/* Reactions bar */}
      <div className="flex items-center gap-2 border-t border-grey-50 px-4 py-2">
        <div className="flex items-center gap-1">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleReaction(emoji)}
              disabled={reactingEmoji === emoji}
              className={[
                'rounded-full px-2 py-0.5 text-sm transition-colors disabled:opacity-60',
                reactions.find((r) => r.emoji === emoji)?.reactedByMe
                  ? 'bg-primary/10 font-semibold'
                  : 'hover:bg-grey-100',
              ].join(' ')}
            >
              {emoji}
            </button>
          ))}
        </div>

        {activeReactions.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-grey-500">
            {activeReactions.map((r) => (
              <span key={r.emoji} className="flex items-center gap-0.5">
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={() => setShowComments((v) => !v)}
          className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-grey-500 hover:bg-grey-100 transition-colors"
        >
          <MessageCircle size={13} />
          {comments.length > 0 ? comments.length : 'Comment'}
        </button>
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-grey-100 px-4 pb-3 pt-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-xs text-grey-400">No comments yet. Be the first!</p>
          )}

          {comments.map((comment) => {
            const commenter = comment.profiles;
            return (
              <div key={comment.id} className="flex items-start gap-2">
                {commenter && <SmallAvatar profile={commenter} />}
                <div className="min-w-0 flex-1 rounded-lg bg-grey-50 px-3 py-2">
                  <p className="text-xs font-semibold text-grey-800">
                    {commenter?.display_name ?? 'Unknown'}
                  </p>
                  <p className="mt-0.5 text-xs text-grey-700">{comment.content}</p>
                </div>
              </div>
            );
          })}

          {user && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleComment(); } }}
                placeholder="Write a comment…"
                maxLength={500}
                className="flex-1 rounded-lg border border-grey-200 px-3 py-1.5 text-xs text-grey-800 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => void handleComment()}
                disabled={!commentText.trim() || isPosting}
                className="flex items-center justify-center rounded-lg bg-primary p-2 text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
