// Submit result modal — standalone entry point for push notification deep-links.
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { getCompetitionEvent } from '@repo/supabase';
import { ResultSubmissionForm } from '@/components/events/ResultSubmissionForm';
import type { Database } from '@repo/types';

type ResultType = Database['public']['Enums']['result_type'];

interface CompetitionEvent {
  id: string;
  events: { result_type: ResultType | null } | null;
}

export default function SubmitResultModal() {
  const { competitionEventId, competitionId } = useLocalSearchParams<{
    competitionEventId: string;
    competitionId: string;
  }>();
  const router = useRouter();

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', competitionEventId],
    queryFn: async () => {
      const { data } = await getCompetitionEvent(supabase, competitionEventId);
      return data as CompetitionEvent | null;
    },
    enabled: !!competitionEventId,
  });

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.dismiss()}>
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800">Submit Result</Text>
        <View className="w-6" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#2D6A4F" />
        </View>
      ) : !eventData ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-neutral-500 text-sm text-center">
            Event not found or no longer active.
          </Text>
        </View>
      ) : (
        <View className="flex-1 pt-4">
          <ResultSubmissionForm
            competitionEventId={competitionEventId}
            competitionId={competitionId}
            resultType={eventData.events?.result_type ?? 'score'}
            onClose={() => router.dismiss()}
            onSubmitted={() => router.dismiss()}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
