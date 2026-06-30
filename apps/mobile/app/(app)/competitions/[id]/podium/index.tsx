// Podium screen — top 3 with animated reveal, full results list, share button.
import { useEffect, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Animated, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import { getLeaderboard, getCompetition } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
import { formatPoints } from '@/utils/formatters/points';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Finisher {
  profile_id: string;
  final_rank: number | null;
  total_points: number | null;
  gold_count: number | null;
  silver_count: number | null;
  bronze_count: number | null;
  profiles: {
    display_name: string;
    avatar_url: string | null;
    country_code: string | null;
  } | null;
}

function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const pts = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

const CROWN: Record<number, string> = { 1: '👑', 2: '🥈', 3: '🥉' };
const STAND_HEIGHTS: Record<number, number> = { 1: 80, 2: 60, 3: 48 };

function PodiumCard({ finisher, place }: { finisher: Finisher; place: number }) {
  const displayName = finisher.profiles?.display_name ?? 'Unknown';
  const avatarUrl = finisher.profiles?.avatar_url ?? null;
  const flag = getFlagEmoji(finisher.profiles?.country_code ?? null);

  return (
    <View className="items-center gap-1">
      <Text className="text-2xl">{CROWN[place] ?? '🏅'}</Text>
      <View className="w-14 h-14 rounded-full bg-neutral-200 overflow-hidden border-4 border-white shadow">
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 56, height: 56 }} />
        ) : (
          <View className="w-14 h-14 rounded-full bg-primary-muted items-center justify-center">
            <Text className="text-xl font-bold text-primary">
              {(displayName[0] ?? '?').toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text className="text-xs font-semibold text-neutral-800 text-center max-w-20" numberOfLines={2}>
        {displayName}{flag ? ` ${flag}` : ''}
      </Text>
      <Text className="text-xs font-mono text-neutral-500">
        {formatPoints(finisher.total_points ?? 0)}
      </Text>
    </View>
  );
}

export default function PodiumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const slideAnim = useRef(new Animated.Value(60)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { data: compData } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data } = await getCompetition(supabase, id);
      return data as CompetitionRow | null;
    },
    enabled: !!id,
  });

  const { data: leaderboardData } = useQuery({
    queryKey: ['competition', id, 'leaderboard'],
    queryFn: async () => {
      const { data } = await getLeaderboard(supabase, id);
      return (data ?? []) as Finisher[];
    },
    enabled: !!id,
  });

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const finishers = (leaderboardData ?? []).sort(
    (a, b) => (a.final_rank ?? 999) - (b.final_rank ?? 999)
  );

  const first = finishers.find((f) => f.final_rank === 1);
  const second = finishers.find((f) => f.final_rank === 2);
  const third = finishers.find((f) => f.final_rank === 3);
  const rest = finishers.filter((f) => (f.final_rank ?? 0) > 3);

  async function handleShare() {
    const lines = finishers.slice(0, 3).map((f) => {
      const name = f.profiles?.display_name ?? 'Unknown';
      return `${CROWN[f.final_rank ?? 0] ?? f.final_rank}. ${name}: ${formatPoints(f.total_points ?? 0)}`;
    });
    await Share.share({
      message: `🏆 ${compData?.name ?? 'Competition'} Results\n\n${lines.join('\n')}`,
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <ScrollView contentContainerClassName="pb-10">
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          className="items-center pt-8 pb-6"
        >
          <Text className="text-2xl font-bold text-neutral-900 mb-0.5">
            {compData?.status === 'archived' ? 'Final Results' : '🏆 Competition Complete'}
          </Text>
          <Text className="text-sm text-neutral-500">{compData?.name}</Text>
        </Animated.View>

        {/* Podium visual */}
        {(first ?? second ?? third) && (
          <Animated.View
            style={{ opacity: fadeAnim }}
            className="flex-row items-end justify-center gap-4 px-6 pb-8"
          >
            {/* 2nd place */}
            <View className="items-center gap-2">
              {second && <PodiumCard finisher={second} place={2} />}
              <View
                style={{ height: STAND_HEIGHTS[2] }}
                className="w-24 bg-neutral-300 rounded-t-lg items-center justify-center"
              >
                <Text className="text-2xl font-bold text-white">2</Text>
              </View>
            </View>

            {/* 1st place */}
            <View className="items-center gap-2">
              {first && <PodiumCard finisher={first} place={1} />}
              <View
                style={{ height: STAND_HEIGHTS[1] }}
                className="w-24 bg-gold rounded-t-lg items-center justify-center"
              >
                <Text className="text-2xl font-bold text-white">1</Text>
              </View>
            </View>

            {/* 3rd place */}
            <View className="items-center gap-2">
              {third && <PodiumCard finisher={third} place={3} />}
              <View
                style={{ height: STAND_HEIGHTS[3] }}
                className="w-24 bg-bronze rounded-t-lg items-center justify-center"
              >
                <Text className="text-2xl font-bold text-white">3</Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Action buttons */}
        <View className="flex-row gap-3 px-6 mb-6">
          <TouchableOpacity
            className="flex-1 border border-neutral-200 rounded-lg py-3 items-center"
            onPress={() => router.push(MOBILE_ROUTES.COMPETITION_LEADERBOARD(id))}
          >
            <Text className="text-sm font-semibold text-neutral-700">Full Results</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 bg-primary rounded-lg py-3 items-center"
            onPress={handleShare}
          >
            <Text className="text-sm font-semibold text-white">Share Results</Text>
          </TouchableOpacity>
        </View>

        {/* All finishers list */}
        {rest.length > 0 && (
          <View className="mx-4 rounded-lg border border-neutral-200 bg-white overflow-hidden">
            <Text className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 border-b border-neutral-100">
              All finishers
            </Text>
            {finishers.map((f) => (
              <View
                key={f.profile_id}
                className={`flex-row items-center px-4 py-3 border-b border-neutral-100 ${
                  f.profile_id === profile?.id ? 'bg-primary-muted/30' : ''
                }`}
              >
                <Text className="w-8 text-sm font-bold text-neutral-700">
                  {f.final_rank ?? '-'}
                </Text>
                <Text className="flex-1 text-sm font-medium text-neutral-800">
                  {f.profiles?.display_name ?? 'Unknown'}
                  {f.profile_id === profile?.id ? (
                    <Text className="text-xs text-primary"> (you)</Text>
                  ) : null}
                </Text>
                <Text className="text-sm font-mono font-semibold text-neutral-700">
                  {formatPoints(f.total_points ?? 0)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
