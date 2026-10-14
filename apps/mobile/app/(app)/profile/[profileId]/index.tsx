/*
 * This file defines the index module.
 */

// Other user's profile — avatar, stats, personal bests, and follow, message, block and report actions.
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { ChevronLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { CompetitionHistory } from '@/components/profile/CompetitionHistory';
import { getProfile, getPersonalBests } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { ProfileActions } from '@/components/profile/ProfileActions';
import { formatPointsValue } from '@/utils/formatters/points';
import type { ProfileWithStats as ProfileRow, PersonalBest } from '@/types/profile';
import { formatResultValue } from '@/utils/formatters/result';

// Handles get flag emoji.
function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const pts = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

// Renders the stat pill component.
function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 items-center rounded-lg bg-neutral-50 px-2 py-3">
      <Text className="text-lg font-bold text-neutral-900">{value}</Text>
      <Text className="text-xs text-neutral-500 text-center mt-0.5">{label}</Text>
    </View>
  );
}

// Renders the other profile screen component.
export default function OtherProfileScreen() {
  const { profileId } = useLocalSearchParams<{ profileId: string }>();
  const router = useRouter();
  const { profile: myProfile } = useAuthStore();

  const { data: profileData, isLoading } = useQuery({
    queryKey: ['profile', profileId],
    queryFn: async () => {
      const { data } = await getProfile(supabase, profileId);
      return data as ProfileRow | null;
    },
    enabled: !!profileId,
  });

  const { data: pbData } = useQuery({
    queryKey: ['profile', profileId, 'personal-bests'],
    queryFn: async () => {
      const { data } = await getPersonalBests(supabase, profileId);
      return (data ?? []) as PersonalBest[];
    },
    enabled: !!profileId,
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#2D6A4F" />
      </SafeAreaView>
    );
  }

  if (!profileData) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white">
        <Text className="text-neutral-500">Profile not found</Text>
      </SafeAreaView>
    );
  }

  const profile = profileData;
  const personalBests = pbData ?? [];
  const stats = profile.career_stats;
  const flag = getFlagEmoji(profile.country_code ?? null);
  const isOwnProfile = profile.id === myProfile?.id;
  const isDeleted = !!profile.deleted_at;
  // Guest profiles and deleted accounts have nobody behind them to follow or message.
  const canInteract = !isOwnProfile && !isDeleted && !profile.is_ghost;

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <View className="flex-row items-center px-4 py-3 bg-white border-b border-neutral-200">
        <TouchableOpacity onPress={() => router.back()} className="mr-3" accessibilityLabel="Back">
          <ChevronLeft size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800 flex-1" numberOfLines={1}>
          {profile.display_name}
        </Text>
      </View>
      <ScrollView>
        <View className="bg-white px-4 pt-6 pb-5 border-b border-neutral-200">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center gap-4 flex-1">
              <View className="w-20 h-20 rounded-full bg-neutral-200 overflow-hidden border-4 border-white shadow">
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80 }} />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-primary-muted items-center justify-center">
                    <Text className="text-3xl font-bold text-primary">
                      {(profile.display_name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-neutral-900">
                  {profile.display_name}
                  {flag ? ` ${flag}` : ''}
                </Text>
                {profile.city ? (
                  <Text className="text-sm text-neutral-500">{profile.city}</Text>
                ) : null}
                {profile.bio ? (
                  <Text className="text-sm text-neutral-600 mt-1" numberOfLines={3}>
                    {profile.bio}
                  </Text>
                ) : null}
              </View>
            </View>
          </View>

          {canInteract && <ProfileActions profileId={profileId} displayName={profile.display_name} />}
          {isDeleted && (
            <Text className="text-sm text-neutral-500 mb-4">
              This account has been deleted. Their past results stay in the competitions they took part in.
            </Text>
          )}

          {stats && (
            <View className="flex-row gap-2">
              <StatPill label="Competed" value={stats.total_competitions} />
              <StatPill label="Points" value={formatPointsValue(stats.total_points)} />
              <StatPill label="🥇" value={stats.gold_count} />
              <StatPill label="🥈" value={stats.silver_count} />
              <StatPill label="🥉" value={stats.bronze_count} />
              <StatPill label="Events" value={stats.total_events} />
            </View>
          )}
        </View>

        <View className="px-4 pt-5">
          <Text className="text-base font-semibold text-neutral-800 mb-3">Personal Bests</Text>
          {personalBests.length === 0 ? (
            <View className="rounded-lg border border-dashed border-neutral-200 bg-white p-8 items-center">
              <Text className="text-neutral-400 text-sm">No personal bests yet</Text>
            </View>
          ) : (
            <View className="rounded-lg border border-neutral-200 bg-white overflow-hidden">
              {personalBests.map((pb, i) => (
                <View
                  key={pb.id}
                  className={`flex-row items-center px-4 py-3 ${
                    i < personalBests.length - 1 ? 'border-b border-neutral-100' : ''
                  }`}
                >
                  <View className="flex-1">
                    <Text className="text-sm font-medium text-neutral-800">
                      {pb.events?.name ?? 'Unknown event'}
                    </Text>
                    <Text className="text-xs text-neutral-500">{pb.events?.event_categories?.name}</Text>
                  </View>
                  <Text className="text-sm font-semibold font-mono text-neutral-700">
                    {formatResultValue(pb.result_value_primary, pb.events?.result_type ?? 'score')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <CompetitionHistory profileId={profileId} />
      </ScrollView>
    </SafeAreaView>
  );
}
