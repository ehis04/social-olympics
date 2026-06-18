// Mobile feed item card — activity text, emoji reactions, collapsible comments.
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { MessageCircle, Send } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { formatRelativeTime } from '@/utils/formatters/date';
import { MOBILE_ROUTES } from '@/constants/routes';

interface FeedActor {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface FeedComment {
  id: string;
  profile_id: string;
  content: string;
  created_at: string;
  profiles: { id: string; display_name: string; avatar_url: string | null } | null;
}

interface FeedReaction {
  emoji: string;
  count: number;
  reactedByMe: boolean;
}

interface FeedItem {
  id: string;
  activity_type: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  actor: FeedActor | null;
  subject: FeedActor | null;
}

interface Props {
  item: FeedItem;
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

export function FeedItemCard({ item, comments: initialComments = [], reactions: initialReactions = [] }: Props) {
  const router = useRouter();
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<FeedComment[]>(initialComments);
  const [reactions, setReactions] = useState<FeedReaction[]>(initialReactions);
  const [commentText, setCommentText] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [reactingEmoji, setReactingEmoji] = useState<string | null>(null);

  const actor = item.actor;
  const subject = item.subject;
  const action = formatActivityType(item.activity_type, item.metadata);
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
    if (error || !data) { toast.error('Failed to post comment'); return; }
    setComments((prev) => [...prev, data]);
    setCommentText('');
  }

  return (
    <View className="rounded-lg border border-neutral-100 bg-white shadow-sm mb-3">
      {/* Main row */}
      <View className="flex-row items-start gap-3 p-4">
        <TouchableOpacity onPress={() => actor && router.push(MOBILE_ROUTES.PROFILE(actor.id))}>
          {actor ? (
            <AvatarCircle displayName={actor.display_name} avatarUrl={actor.avatar_url} />
          ) : (
            <View className="w-9 h-9 rounded-full bg-primary-muted items-center justify-center">
              <Text className="text-lg">🏅</Text>
            </View>
          )}
        </TouchableOpacity>

        <View className="flex-1 min-w-0">
          <Text className="text-sm text-neutral-700 flex-wrap">
            {actor && (
              <Text
                className="font-semibold text-neutral-900"
                onPress={() => router.push(MOBILE_ROUTES.PROFILE(actor.id))}
              >
                {actor.display_name}{' '}
              </Text>
            )}
            <Text>{action}</Text>
            {subject && subject.id !== actor?.id && (
              <Text>
                {' '}against{' '}
                <Text
                  className="font-semibold text-neutral-900"
                  onPress={() => router.push(MOBILE_ROUTES.PROFILE(subject.id))}
                >
                  {subject.display_name}
                </Text>
              </Text>
            )}
          </Text>
          <Text className="mt-0.5 text-xs text-neutral-400">{formatRelativeTime(item.created_at)}</Text>
        </View>
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
