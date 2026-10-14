/*
 * This file defines the index module.
 */

// Tiebreaker modal — a tied competitor nominates one event they both contested (sealed until both pick).
import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle } from 'lucide-react-native';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { useAuthStore } from '@/stores/auth';

interface TiebreakerInfo {
  id: string;
  profileIdA: string;
  profileIdB: string;
  status: 'pending_nomination' | 'nominated' | 'in_progress' | 'resolved';
  viewerNominated: boolean;
  nominatableEvents: { id: string; name: string }[];
}

// Renders the tiebreaker modal component.
export default function TiebreakerModal() {
  const { competitionId, tiebreakerId } = useLocalSearchParams<{ competitionId: string; tiebreakerId?: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: tiebreakers, isLoading } = useQuery({
    queryKey: ['competition', competitionId, 'tiebreakers'],
    queryFn: async () => {
      const { data, error } = await apiCall<TiebreakerInfo[]>(`/api/competitions/${competitionId}/tiebreakers`);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!competitionId,
  });

  const tiebreaker = (tiebreakers ?? []).find((tb) =>
    tiebreakerId ? tb.id === tiebreakerId : [tb.profileIdA, tb.profileIdB].includes(profile?.id ?? '') &&
      (tb.status === 'pending_nomination' || tb.status === 'nominated'),
  );

  async function handleSubmit() {
    if (!selectedEventId || !tiebreaker) return;
    setSubmitting(true);
    const { error } = await apiCall(`/api/competitions/${competitionId}/tiebreakers/${tiebreaker.id}/nominate`, {
      method: 'POST',
      body: JSON.stringify({ nominated_event_id: selectedEventId }),
    });
    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }

    triggerSuccess();
    toast.success('Nomination submitted');
    queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
    router.dismiss();
  }

  const canNominate = !!tiebreaker && !tiebreaker.viewerNominated &&
    (tiebreaker.status === 'pending_nomination' || tiebreaker.status === 'nominated');

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.dismiss()}>
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800">Tiebreaker</Text>
        <View className="w-6" />
      </View>

      <ScrollView contentContainerClassName="px-4 py-6 gap-5">
        <View>
          <Text className="text-sm font-semibold text-neutral-700 mb-1">You are tied on points and medals</Text>
          <Text className="text-sm text-neutral-500">
            Nominate one event you both competed in. Picks stay hidden until both players have chosen, then the
            head-to-head results across the two events decide the higher place.
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#2D6A4F" />
          </View>
        ) : !tiebreaker ? (
          <Text className="text-sm text-neutral-500">There is no tiebreaker waiting for you.</Text>
        ) : tiebreaker.viewerNominated ? (
          <Text className="text-sm font-medium text-neutral-700">Your nomination is in. Waiting for your opponent.</Text>
        ) : tiebreaker.nominatableEvents.length === 0 ? (
          <Text className="text-sm text-neutral-500">You have no confirmed events in common, so the host will decide.</Text>
        ) : (
          <View className="gap-3">
            {tiebreaker.nominatableEvents.map((event) => {
              const isSelected = selectedEventId === event.id;
              return (
                <TouchableOpacity
                  key={event.id}
                  className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${
                    isSelected ? 'border-primary bg-primary-muted' : 'border-neutral-200 bg-neutral-50'
                  }`}
                  onPress={() => setSelectedEventId(event.id)}
                  activeOpacity={0.7}
                >
                  <Text className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-neutral-800'}`}>
                    {event.name}
                  </Text>
                  {isSelected && <CheckCircle size={20} color="#2D6A4F" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {canNominate && tiebreaker.nominatableEvents.length > 0 && (
          <TouchableOpacity
            className="bg-primary rounded-lg py-4 items-center"
            onPress={handleSubmit}
            disabled={!selectedEventId || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Submit nomination</Text>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
