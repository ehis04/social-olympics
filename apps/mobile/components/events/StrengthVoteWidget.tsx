// StrengthVoteWidget — peers confirm or dispute self-declared strength ratings.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { ThumbsUp, ThumbsDown, CheckCircle, Info } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerLight } from '@/utils/helpers/haptics';

interface TeamMemberRating {
  teamMemberId: string;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  strengthRating: number;
  ratingSource: string;
  submissionRound: 1 | 2;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  pendingRatings: TeamMemberRating[];
  currentUserId: string;
  onVoted: () => void;
}

export function StrengthVoteWidget({
  competitionId,
  competitionEventId,
  pendingRatings,
  currentUserId,
  onVoted,
}: Props) {
  const [voted, setVoted] = useState<Record<string, 'confirm' | 'reject'>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const unvoted = pendingRatings.filter(
    (r) => r.profileId !== currentUserId && !voted[r.teamMemberId]
  );

  async function handleVote(rating: TeamMemberRating, vote: 'confirm' | 'reject') {
    setSubmitting(rating.teamMemberId);
    const { data, error } = await apiCall(
      `/api/competitions/${competitionId}/events/${competitionEventId}/strength-vote`,
      {
        method: 'POST',
        body: JSON.stringify({
          team_member_id: rating.teamMemberId,
          vote,
          submission_round: rating.submissionRound,
        }),
      }
    );
    setSubmitting(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    triggerLight();
    setVoted((prev) => ({ ...prev, [rating.teamMemberId]: vote }));

    const outcome = (data as Record<string, unknown> | null)?.outcome as string | undefined;
    if (outcome === 'confirmed') toast.success(`${rating.displayName}'s rating confirmed`);
    else if (outcome === 'round2_required') toast.info('Rating disputed: round 2 vote required');
    else if (outcome === 'host_required') toast.info('Rating disputed: host will decide');
    else toast.success('Vote recorded');

    onVoted();
  }

  if (pendingRatings.length === 0) return null;

  if (unvoted.length === 0) {
    return (
      <View className="flex-row items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 mx-4">
        <CheckCircle size={15} color="#16A34A" />
        <Text className="text-sm font-medium text-green-800 flex-1">
          You have voted on all pending strength ratings
        </Text>
      </View>
    );
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4 p-4 gap-4">
      <View className="flex-row items-start gap-2">
        <Info size={15} color="#2D6A4F" style={{ marginTop: 2 }} />
        <View className="flex-1">
          <Text className="text-sm font-semibold text-neutral-700">Strength Rating Votes</Text>
          <Text className="text-xs text-neutral-500 mt-0.5">
            Vote to confirm or dispute each competitor's strength rating before teams are assigned.
          </Text>
        </View>
      </View>

      {unvoted.map((rating) => (
        <View
          key={rating.teamMemberId}
          className="flex-row items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
        >
          <View className="w-9 h-9 rounded-full bg-neutral-200 overflow-hidden">
            {rating.avatarUrl ? (
              <Image source={{ uri: rating.avatarUrl }} style={{ width: 36, height: 36 }} />
            ) : (
              <View className="w-9 h-9 rounded-full bg-primary-muted items-center justify-center">
                <Text className="text-sm font-bold text-primary">
                  {(rating.displayName[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-1">
            <Text className="text-sm font-semibold text-neutral-800" numberOfLines={1}>
              {rating.displayName}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-xs text-neutral-500">
                Self-rated <Text className="font-semibold text-neutral-700">{rating.strengthRating}/10</Text>
              </Text>
              {rating.submissionRound === 2 && (
                <View className="rounded-full bg-orange-100 px-1.5 py-0.5">
                  <Text className="text-xs font-medium text-orange-700">Round 2</Text>
                </View>
              )}
            </View>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-row items-center gap-1 border border-green-300 bg-green-50 rounded-lg px-3 py-1.5"
              onPress={() => handleVote(rating, 'confirm')}
              disabled={submitting === rating.teamMemberId}
            >
              {submitting === rating.teamMemberId ? (
                <ActivityIndicator size="small" color="#16A34A" />
              ) : (
                <>
                  <ThumbsUp size={12} color="#15803D" />
                  <Text className="text-xs font-semibold text-green-700 ml-1">Confirm</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row items-center gap-1 border border-red-200 bg-red-50 rounded-lg px-3 py-1.5"
              onPress={() => handleVote(rating, 'reject')}
              disabled={submitting === rating.teamMemberId}
            >
              <ThumbsDown size={12} color="#DC2626" />
              <Text className="text-xs font-semibold text-red-600 ml-1">Dispute</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}
