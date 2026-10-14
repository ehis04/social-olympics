import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { getCompetitionHistory } from '@repo/supabase';
import { supabase } from '@/lib/supabase/client';
import { MOBILE_ROUTES } from '@/constants/routes';
import { formatPointsValue } from '@/utils/formatters/points';

export function CompetitionHistory({ profileId }: { profileId: string }) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['profile', profileId, 'competition-history'],
    enabled: !!profileId,
    queryFn: async () => {
      const result = await getCompetitionHistory(supabase, profileId);
      if (result.error) throw new Error(result.error.message);
      return result.data ?? [];
    },
  });
  return (
    <View className="px-4 pt-5 pb-6">
      <Text className="mb-3 text-base font-semibold text-neutral-800">Competition history</Text>
      {isLoading ? <ActivityIndicator color="#2D6A4F" /> : error ? (
        <TouchableOpacity onPress={() => void refetch()} accessibilityRole="button">
          <Text className="text-red-600">Could not load history. Tap to retry.</Text>
        </TouchableOpacity>
      ) : !data?.length ? <Text className="text-sm text-neutral-500">No competitions to show yet.</Text> : (
        <View className="gap-3">
          {data.map((entry) => {
            const competition = entry.competitions;
            const finished = ['complete', 'archived'].includes(competition.status);
            return (
              <TouchableOpacity key={competition.id} accessibilityRole="button"
                className="rounded-lg border border-neutral-200 bg-white p-4"
                onPress={() => router.push(finished ? MOBILE_ROUTES.COMPETITION_PODIUM(competition.id) : MOBILE_ROUTES.COMPETITION_EVENTS(competition.id))}>
                <Text className="font-semibold text-neutral-900">{competition.name}</Text>
                <Text className="mt-1 text-sm capitalize text-neutral-500">{finished ? 'Completed' : competition.status}</Text>
                <Text className="mt-1 text-sm text-neutral-600">
                  {finished && entry.final_rank ? `Final place #${entry.final_rank} · ` : ''}
                  {formatPointsValue(entry.total_points)} points · {entry.events_completed}/{competition.total_events} events
                </Text>
                <Text className="mt-1 text-xs text-neutral-500">🥇 {entry.gold_count} · 🥈 {entry.silver_count} · 🥉 {entry.bronze_count}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}
