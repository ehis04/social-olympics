// PerformanceVotePanel — MVP and worst-performer voting for confirmed events.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Trophy, ThumbsDown, CheckCircle } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerLight } from '@/utils/helpers/haptics';

interface Competitor {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  competitors: Competitor[];
  mvpEnabled: boolean;
  worstPerformerEnabled: boolean;
  currentUserId: string;
  existingMvpVote: string | null;
  existingWorstVote: string | null;
  onVoted: () => void;
}

type VoteType = 'mvp' | 'worst_performer';

interface VoteState {
  mvp: string | null;
  worst: string | null;
}

function AvatarCircle({ displayName, avatarUrl }: { displayName: string; avatarUrl: string | null }) {
  return (
    <View className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden">
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: 32, height: 32 }} />
      ) : (
        <View className="w-8 h-8 rounded-full bg-primary-muted items-center justify-center">
          <Text className="text-xs font-semibold text-primary">
            {(displayName[0] ?? '?').toUpperCase()}
          </Text>
        </View>
      )}
    </View>
  );
}

interface VoteSectionProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  competitors: Competitor[];
  selectedId: string | null;
  submitting: boolean;
  onVote: (profileId: string) => void;
}

function VoteSection({ title, icon, description, competitors, selectedId, submitting, onVote }: VoteSectionProps) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-1.5">
        {icon}
        <Text className="text-xs font-semibold text-neutral-700">{title}</Text>
      </View>
      <Text className="text-xs text-neutral-500">{description}</Text>

      {selectedId ? (
        <View className="flex-row items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <CheckCircle size={14} color="#16A34A" />
          <Text className="text-xs font-medium text-green-800 flex-1">
            Vote submitted: select another to change
          </Text>
        </View>
      ) : null}

      <View className="gap-1.5">
        {competitors.map((c) => {
          const isSelected = selectedId === c.profileId;
          return (
            <TouchableOpacity
              key={c.profileId}
              className={`flex-row items-center gap-3 rounded-lg border px-3 py-2.5 ${
                isSelected
                  ? 'border-primary bg-primary-muted'
                  : 'border-neutral-200 bg-white'
              }`}
              onPress={() => onVote(c.profileId)}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <AvatarCircle displayName={c.displayName} avatarUrl={c.avatarUrl} />
              <Text
                className={`flex-1 text-sm ${isSelected ? 'font-semibold text-primary' : 'text-neutral-700'}`}
                numberOfLines={1}
              >
                {c.displayName}
              </Text>
              {isSelected && <CheckCircle size={14} color="#2D6A4F" />}
              {submitting && <ActivityIndicator size="small" color="#2D6A4F" />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function PerformanceVotePanel({
  competitionId,
  competitionEventId,
  competitors,
  mvpEnabled,
  worstPerformerEnabled,
  currentUserId,
  existingMvpVote,
  existingWorstVote,
  onVoted,
}: Props) {
  const [votes, setVotes] = useState<VoteState>({
    mvp: existingMvpVote,
    worst: existingWorstVote,
  });
  const [submitting, setSubmitting] = useState<VoteType | null>(null);

  async function handleVote(profileId: string, voteType: VoteType) {
    setSubmitting(voteType);
    const { error } = await apiCall(
      `/api/competitions/${competitionId}/events/${competitionEventId}/vote`,
      {
        method: 'POST',
        body: JSON.stringify({ voted_for_profile_id: profileId, vote_type: voteType }),
      }
    );
    setSubmitting(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    triggerLight();
    setVotes((prev) => ({
      ...prev,
      [voteType === 'mvp' ? 'mvp' : 'worst']: profileId,
    }));
    toast.success(voteType === 'mvp' ? 'MVP vote submitted' : 'Worst performer vote submitted');
    onVoted();
  }

  const eligibleForMvp = competitors.filter((c) => c.profileId !== currentUserId);

  if (!mvpEnabled && !worstPerformerEnabled) return null;

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4 p-4 gap-4">
      <Text className="text-sm font-semibold text-neutral-700">Event Voting</Text>

      {mvpEnabled && (
        <VoteSection
          title="MVP"
          icon={<Trophy size={14} color="#C9A84C" />}
          description="Who performed best in this event?"
          competitors={eligibleForMvp}
          selectedId={votes.mvp}
          submitting={submitting === 'mvp'}
          onVote={(id) => handleVote(id, 'mvp')}
        />
      )}

      {mvpEnabled && worstPerformerEnabled && (
        <View className="h-px bg-neutral-100" />
      )}

      {worstPerformerEnabled && (
        <VoteSection
          title="Worst Performer"
          icon={<ThumbsDown size={14} color="#9CA3AF" />}
          description="Who struggled most in this event?"
          competitors={competitors}
          selectedId={votes.worst}
          submitting={submitting === 'worst_performer'}
          onVote={(id) => handleVote(id, 'worst_performer')}
        />
      )}
    </View>
  );
}
