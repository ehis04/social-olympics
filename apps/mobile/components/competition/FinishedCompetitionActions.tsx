/*
 * This file defines the FinishedCompetitionActions user-interface component.
 */

// FinishedCompetitionActions — host-only archive and new season actions for a finished competition.
import { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { MOBILE_ROUTES } from '@/constants/routes';

interface Props {
  competitionId: string;
  status: string;
}

// Renders the finished competition actions component.
export function FinishedCompetitionActions({ competitionId, status }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<'archive' | 'season' | null>(null);

  const { data: nextSeason } = useQuery({
    queryKey: ['competition', competitionId, 'next-season'],
    queryFn: async () => {
      const { data } = await supabase
        .from('competitions')
        .select('id, season_number')
        .eq('parent_competition_id', competitionId)
        .limit(1)
        .maybeSingle();
      return data ?? null;
    },
  });

  function confirmArchive() {
    Alert.alert(
      'Archive competition?',
      'It moves to your past competitions. Members can still view the results and podium.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            setBusy('archive');
            const { error } = await apiCall(`/api/competitions/${competitionId}/archive`, { method: 'POST' });
            setBusy(null);
            if (error) { toast.error(error.message); return; }
            toast.success('Competition archived');
            void queryClient.invalidateQueries({ queryKey: ['competition', competitionId] });
            void queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
          },
        },
      ],
    );
  }

  function confirmNewSeason() {
    Alert.alert(
      'Start a new season?',
      'This creates a fresh copy with the same events, points and members, all starting on zero. You can change anything before the first event begins.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start season',
          onPress: async () => {
            setBusy('season');
            const { data, error } = await apiCall<{ id: string }>(`/api/competitions/${competitionId}/new-season`, {
              method: 'POST',
            });
            setBusy(null);
            if (error || !data) { toast.error(error?.message ?? 'The new season could not be started'); return; }
            toast.success('New season created');
            void queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
            void queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'next-season'] });
            router.push(MOBILE_ROUTES.COMPETITION_SETTINGS(data.id));
          },
        },
      ],
    );
  }

  return (
    <View className="flex-row gap-3">
      {status === 'complete' && (
        <TouchableOpacity
          className="flex-1 border border-neutral-200 rounded-lg py-3 items-center"
          onPress={confirmArchive}
          disabled={busy !== null}
        >
          {busy === 'archive' ? <ActivityIndicator color="#2D6A4F" size="small" /> : (
            <Text className="text-sm font-semibold text-neutral-700">Archive</Text>
          )}
        </TouchableOpacity>
      )}
      <TouchableOpacity
        className="flex-1 bg-primary rounded-lg py-3 items-center"
        onPress={() => (nextSeason ? router.push(MOBILE_ROUTES.COMPETITION_SETTINGS(nextSeason.id)) : confirmNewSeason())}
        disabled={busy !== null}
      >
        {busy === 'season' ? <ActivityIndicator color="#fff" size="small" /> : (
          <Text className="text-sm font-semibold text-white">
            {nextSeason ? `Go to season ${nextSeason.season_number}` : 'Start new season'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
