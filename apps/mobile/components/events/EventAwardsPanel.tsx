/*
 * This file defines the EventAwardsPanel user-interface component.
 */

// EventAwardsPanel — shows finalised MVP / worst-performer awards and lets the host finalise them.
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ThumbsDown, Trophy } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';

interface Winner {
  id: string;
  display_name: string;
}

interface AwardOutcome {
  voteType: 'mvp' | 'worst_performer';
  status: 'awarded' | 'no_votes' | 'already_final' | 'disabled';
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  mvpEnabled: boolean;
  worstEnabled: boolean;
  canFinalise: boolean;
  onFinalised: () => void;
}

// Renders the event awards panel component.
export function EventAwardsPanel({ competitionId, competitionEventId, mvpEnabled, worstEnabled, canFinalise, onFinalised }: Props) {
  const [isFinalising, setIsFinalising] = useState(false);
  const path = `/api/competitions/${competitionId}/events/${competitionEventId}/vote-results`;
  const { data, refetch } = useQuery({
    queryKey: ['event', competitionEventId, 'awards'],
    queryFn: async () => (await apiCall<{ mvp: Winner | null; worst_performer: Winner | null }>(path)).data,
    enabled: mvpEnabled || worstEnabled,
  });

  if (!mvpEnabled && !worstEnabled) return null;
  const mvp = data?.mvp ?? null;
  const worst = data?.worst_performer ?? null;
  const pending = (mvpEnabled && !mvp) || (worstEnabled && !worst);
  const showFinalise = canFinalise && pending;
  if (!mvp && !worst && !showFinalise) return null;

  async function finalise() {
    setIsFinalising(true);
    const { data: result, error } = await apiCall<{ outcomes: AwardOutcome[] }>(path, { method: 'POST' });
    setIsFinalising(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const outcomes = result?.outcomes ?? [];
    const awarded = outcomes.filter((outcome) => outcome.status === 'awarded').length;
    const empty = outcomes.filter((outcome) => outcome.status === 'no_votes');
    if (awarded > 0) toast.success(awarded === 1 ? 'Award finalised' : 'Awards finalised');
    if (empty.length > 0) {
      toast.info(`No ${empty.map((o) => (o.voteType === 'mvp' ? 'MVP' : 'worst performer')).join(' or ')} votes yet, so that vote stays open.`);
    }
    void refetch();
    onFinalised();
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4 p-4 gap-3">
      <Text className="text-sm font-semibold text-neutral-700">Awards</Text>
      {mvpEnabled && (
        <View className="flex-row items-center gap-3 rounded-lg bg-amber-50 px-3 py-2.5">
          <Trophy size={16} color="#D97706" />
          <Text className="text-sm text-neutral-700 flex-1">
            <Text className="font-semibold">MVP: </Text>{mvp ? `${mvp.display_name} (+1 pt)` : 'Voting open'}
          </Text>
        </View>
      )}
      {worstEnabled && (
        <View className="flex-row items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2.5">
          <ThumbsDown size={16} color="#6B7280" />
          <Text className="text-sm text-neutral-700 flex-1">
            <Text className="font-semibold">Worst performer: </Text>{worst ? `${worst.display_name} (−1 pt)` : 'Voting open'}
          </Text>
        </View>
      )}
      {showFinalise && (
        <View className="gap-2 border-t border-neutral-100 pt-3">
          <Text className="text-xs text-neutral-500">
            Finalising awards the bonus points and closes these votes. Ties are settled at random.
          </Text>
          <TouchableOpacity className="bg-primary rounded-lg py-2.5 items-center" onPress={() => void finalise()} disabled={isFinalising}>
            {isFinalising ? <ActivityIndicator color="#fff" size="small" /> : (
              <Text className="text-sm font-semibold text-white">Finalise awards</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
