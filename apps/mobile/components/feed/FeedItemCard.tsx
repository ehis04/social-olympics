/*
 * This file defines the FeedItemCard user-interface component.
 */

// Mobile feed item card — activity text, emoji reactions, collapsible comments and reporting.
import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MessageCircle, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { formatRelativeTime } from '@/utils/formatters/date';
import { MOBILE_ROUTES } from '@/constants/routes';
import { formatPlace } from '@/utils/formatters/result';
import { useAuthStore } from '@/stores/auth';
import { ReportButton } from '@/components/moderation/ReportButton';

interface FeedActor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

export interface FeedComment {
  id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profiles: { id: string; display_name: string; avatar_url: string | null } | null;
}

export interface FeedReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

export interface FeedItem {
  id: string;
  event_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor: FeedActor | null;
  subject: FeedActor | null;
}

interface Props {
  item: FeedItem;
  competitionId?: string;
  comments?: FeedComment[];
  reactions?: FeedReaction[];
}

const EMPTY_COMMENTS: FeedComment[] = [];
const EMPTY_REACTIONS: FeedReaction[] = [];

const REACTION_EMOJIS = ['👏', '🔥', '🥇', '😂', '😮'];

interface FeedDescription {
  lead: FeedActor | null;
  text: string;
  trailing?: FeedActor | null;
}

// Handles medal for place.
function medalForPlace(place: number): string {
  if (place === 1) return ' 🥇';
  if (place === 2) return ' 🥈';
  if (place === 3) return ' 🥉';
  return '';
}

// Builds the sentence shown for a feed item from its type and metadata, matching the web feed.
function describeFeedItem(item: FeedItem): FeedDescription {
  const metadata = item.metadata;
  const eventName = typeof metadata?.event_name === 'string' ? metadata.event_name : 'an event';
  const actor = item.actor ?? null;
  const subject = item.subject ?? null;

  switch (item.event_type) {
    case 'result_confirmed': {
      const place = typeof metadata?.finishing_place === 'number' ? metadata.finishing_place : null;
      const isDnf = metadata?.is_dnf === true;
      if (subject && (place !== null || isDnf)) {
        return {
          lead: subject,
          text: isDnf ? `did not finish ${eventName}` : `finished ${formatPlace(place)}${medalForPlace(place!)} in ${eventName}`,
        };
      }
      return { lead: actor, text: `confirmed a result in ${eventName}` };
    }
    case 'event_started': return { lead: actor, text: `started ${eventName}` };
    case 'event_completed': return { lead: actor, text: `completed ${eventName}` };
    case 'member_joined': return { lead: actor ?? subject, text: 'joined the competition' };
    case 'personal_best': return { lead: subject ?? actor, text: `set a personal best in ${eventName}` };
    case 'dispute_raised': return { lead: actor, text: `raised a dispute in ${eventName}` };
    case 'dispute_resolved':
      return {
        lead: actor,
        text: `${metadata?.outcome === 'dismiss' ? 'dismissed' : 'resolved'} a dispute in ${eventName}`,
        trailing: subject && subject.id !== actor?.id ? subject : null,
      };
    case 'tiebreaker_initiated': return { lead: actor, text: 'started a tiebreaker' };
    case 'mvp_awarded':
      return {
        lead: actor ?? subject,
        text: typeof metadata?.event_name === 'string' ? `was voted MVP in ${eventName} 🏆` : 'was awarded MVP 🏆',
      };
    case 'competition_completed':
      return { lead: null, text: '🏆 The competition is complete. Final standings are on the podium.' };
    default: return { lead: actor, text: item.event_type.replace(/_/g, ' ') };
  }
}

// Renders the avatar circle component.
function AvatarCircle({ displayName, avatarUrl, size = 36 }: { displayName: string; avatarUrl: string | null; size?: number }) {
  return (
    <View style={{ width: size, height: size }} className="rounded-full bg-neutral-200 overflow-hidden">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: size, height: size }} />
      ) : (
        <View style={{ width: size, height: size }} className="rounded-full bg-primary-muted items-center justify-center">
          <Text className="text-xs font-bold text-primary">
            {(displayName[0] ?? '?').toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

// Renders the feed item card component.
export function FeedItemCard({
  item,
  competitionId,
  comments: initialComments = EMPTY_COMMENTS,
  reactions: initialReactions = EMPTY_REACTIONS,
}: Props) {
  const router = useRouter();
  const viewerId = useAuthStore((state) => state.profile?.id ?? null);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(initialComments);
  const [reactions, setReactions] = useState<FeedReaction[]>(initialReactions);
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

  // Refreshed feed data replaces local state, so other people's new comments and reactions appear.
  useEffect(() => setComments(initialComments), [initialComments]);
  useEffect(() => setReactions(initialReactions), [initialReactions]);

  const { lead, text, trailing } = describeFeedItem(item);
  const isOwnItem = !!viewerId && (item.actor?.id === viewerId || item.subject?.id === viewerId);
  const activeReactions = reactions.filter((r) => r.count > 0);

  async function handleReaction(emoji: string) {
    setReactingEmoji(emoji);
    const existing = reactions.find((r) => r.emoji === emoji);
    const alreadyReacted = existing?.reactedByMe ?? false;
    const method = alreadyReacted ? 'DELETE' : 'POST';

    const { error } = await apiCall(`/api/feed/${item.id}/reactions`, {
      method,
      body: JSON.stringify({ emoji }),
    });

    setReactingEmoji(null);
    if (error) { toast.error('Failed to update reaction'); return; }

    setReactions((prev) => {
      const updated = prev.filter((r) => r.emoji !== emoji);
      if (!alreadyReacted) {
        updated.push({ emoji, count: (existing?.count ?? 0) + 1, reactedByMe: true });
      } else if (existing && existing.count > 1) {
        updated.push({ emoji, count: existing.count - 1, reactedByMe: false });
      }
      return updated.sort((a, b) => b.count - a.count);
    });
  }

  async function handleComment() {
    if (!commentText.trim()) return;
    setIsPosting(true);
    const { data, error } = await apiCall<FeedComment>(`/api/feed/${item.id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: commentText.trim() }),
    });
    setIsPosting(false);
    if (error || !data) { toast.error(error?.message ?? 'Failed to post comment'); return; }
    const me = useAuthStore.getState().profile;
    setComments((prev) => [
      ...prev,
      { ...data, profiles: data.profiles ?? (me ? { id: me.id, display_name: me.display_name, avatar_url: me.avatar_url } : null) },
    ]);
    setCommentText('');
  }

  return (
    <View className="rounded-lg border border-neutral-100 bg-white shadow-sm mb-3">
      {/* Main row */}
      <View className="flex-row items-start gap-3 p-4">
        <TouchableOpacity onPress={() => lead && router.push(MOBILE_ROUTES.PROFILE(lead.id))}>
          {lead ? (
            <AvatarCircle displayName={lead.display_name} avatarUrl={lead.avatar_url} />
          ) : (
            <View className="w-9 h-9 rounded-full bg-primary-muted items-center justify-center">
              <Text className="text-lg">🏅</Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-1 min-w-0">
          <Text className="text-sm text-neutral-700 flex-wrap">
            {lead && (
              <Text
                className="font-semibold text-neutral-900"
                onPress={() => router.push(MOBILE_ROUTES.PROFILE(lead.id))}
              >
                {lead.display_name}{' '}
              </Text>
            )}
            <Text>{text}</Text>
            {trailing && (
              <Text>
                {' '}for{' '}
                <Text
                  className="font-semibold text-neutral-900"
                  onPress={() => router.push(MOBILE_ROUTES.PROFILE(trailing.id))}
                >
                  {trailing.display_name}
                </Text>
              </Text>
            )}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-400">{formatRelativeTime(item.created_at)}</Text>
          {item.event_type === 'competition_completed' && competitionId && (
            <TouchableOpacity onPress={() => router.push(MOBILE_ROUTES.COMPETITION_PODIUM(competitionId))}>
              <Text className="mt-1 text-xs font-semibold text-primary">View podium</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isOwnItem && (
          <ReportButton
            targetType="feed_item"
            targetId={item.id}
            compact
            {...(competitionId ? { competitionId } : {})}
          />
        )}
      </View>

      {/* Reactions */}
      <View className="flex-row items-center gap-1.5 border-t border-neutral-50 px-4 py-2 flex-wrap">
        {REACTION_EMOJIS.map((emoji) => {
          const reacted = reactions.find((r) => r.emoji === emoji)?.reactedByMe ?? false;
          return (
            <TouchableOpacity
              key={emoji}
              onPress={() => handleReaction(emoji)}
              disabled={reactingEmoji === emoji}
              className={`rounded-full px-2 py-0.5 ${reacted ? 'bg-primary-muted' : ''}`}
            >
              <Text className="text-sm">{emoji}</Text>
            </TouchableOpacity>
          );
        })}

        {activeReactions.length > 0 && (
          <View className="flex-row gap-2 ml-1">
            {activeReactions.map((r) => (
              <Text key={r.emoji} className="text-xs text-neutral-500">
                {r.emoji} {r.count}
              </Text>
            ))}
          </View>
        )}

        <TouchableOpacity
          className="ml-auto flex-row items-center gap-1.5 px-2 py-1 rounded-md"
          onPress={() => setShowComments((v) => !v)}
        >
          <MessageCircle size={13} color="#9CA3AF" />
          <Text className="text-xs text-neutral-500">
            {comments.length > 0 ? String(comments.length) : 'Comment'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Comments */}
      {showComments && (
        <View className="border-t border-neutral-100 px-4 pt-3 pb-3 gap-3">
          {comments.length === 0 && (
            <Text className="text-xs text-neutral-400">No comments yet.</Text>
          )}
          {comments.map((comment) => (
            <View key={comment.id} className="flex-row items-start gap-2">
              <AvatarCircle
                displayName={comment.profiles?.display_name ?? 'U'}
                avatarUrl={comment.profiles?.avatar_url ?? null}
                size={24}
              />
              <View className="flex-1 rounded-lg bg-neutral-50 px-3 py-2">
                <Text className="text-xs font-semibold text-neutral-800">
                  {comment.profiles?.display_name ?? 'Unknown'}
                </Text>
                <Text className="text-xs text-neutral-700 mt-0.5">{comment.content}</Text>
              </View>
            </View>
          ))}

          <View className="flex-row items-center gap-2">
            <TextInput
              className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-800"
              placeholder="Write a comment…"
              maxLength={500}
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={handleComment}
              returnKeyType="send"
            />
            <TouchableOpacity
              className="w-9 h-9 rounded-lg bg-primary items-center justify-center"
              onPress={handleComment}
              disabled={!commentText.trim() || isPosting}
            >
              {isPosting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Send size={13} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
