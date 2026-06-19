// Tiebreaker modal — submit nomination for tied competitors.
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, CheckCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import { getCompetitionMembers, submitTiebreakerNomination } from '@repo/supabase';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { useAuthStore } from '@/stores/auth';
import type { Database } from '@repo/types';

type MemberRow = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

export default function TiebreakerModal() {
  const { competitionId, profileIdA, profileIdB } = useLocalSearchParams<{
    competitionId: string;
    profileIdA: string;
    profileIdB: string;
  }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { data: membersData, isLoading } = useQuery({
    queryKey: ['competition', competitionId, 'members'],
    queryFn: async () => {
      const { data } = await getCompetitionMembers(supabase, competitionId);
      return (data ?? []) as MemberRow[];
    },
    enabled: !!competitionId,
  });

  const tiedMembers = (membersData ?? []).filter(
    (m) => m.profile_id === profileIdA || m.profile_id === profileIdB
  );

  async function handleSubmit() {
    if (!selectedId || !profile?.id) return;
    setSubmitting(true);

    const { error } = await submitTiebreakerNomination(supabase, {
      competition_id: competitionId,
      nominating_profile_id: profile.id,
      nominated_profile_id: selectedId,
    });

    setSubmitting(false);

    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }

    triggerSuccess();
    toast.success('Nomination submitted');
    queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'leaderboard'] });
    router.dismiss();
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.dismiss()}>
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800">Tiebreaker Vote</Text>
        <View className="w-6" />
      </View>

      <ScrollView contentContainerClassName="px-4 py-6 gap-5">
        <View>
          <Text className="text-sm font-semibold text-neutral-700 mb-1">
            These competitors are tied on points
          </Text>
          <Text className="text-sm text-neutral-500">
            Vote for who you think deserves the higher rank based on their overall performance.
          </Text>
        </View>

        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#2D6A4F" />
          </View>
        ) : (
          <View className="gap-3">
            {tiedMembers.map((member) => {
              const displayName = member.profile?.display_name ?? 'Unknown';
              const avatarUrl = member.profile?.avatar_url ?? null;
              const isSelected = selectedId === member.profile_id;

              return (
                <TouchableOpacity
                  key={member.profile_id}
                  className={`flex-row items-center gap-3 rounded-lg border px-4 py-4 ${
                    isSelected ? 'border-primary bg-primary-muted' : 'border-neutral-200 bg-neutral-50'
                  }`}
                  onPress={() => setSelectedId(member.profile_id)}
                  activeOpacity={0.7}
                >
                  <View className="w-10 h-10 rounded-full bg-neutral-200 overflow-hidden">
                    {avatarUrl ? (
                      <Image source={{ uri: avatarUrl }} style={{ width: 40, height: 40 }} />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-primary-muted items-center justify-center">
                        <Text className="text-sm font-bold text-primary">
                          {(displayName[0] ?? '?').toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text
                    className={`flex-1 text-sm font-semibold ${
                      isSelected ? 'text-primary' : 'text-neutral-800'
                    }`}
                  >
                    {displayName}
                    {member.profile_id === profile?.id ? (
                      <Text className="font-normal text-neutral-400"> (you)</Text>
                    ) : null}
                  </Text>

                  {isSelected && <CheckCircle size={20} color="#2D6A4F" />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          className="bg-primary rounded-lg py-4 items-center"
          onPress={handleSubmit}
          disabled={!selectedId || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Submit Vote</Text>
          )}
        </TouchableOpacity>

        <Text className="text-xs text-neutral-400 text-center">
          Your vote is anonymous. The host will resolve ties using nomination results.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
