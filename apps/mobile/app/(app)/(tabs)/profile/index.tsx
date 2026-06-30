// Profile tab — own profile, career stats, personal bests, edit button.
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Settings } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getProfile, getPersonalBests } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import type { Database } from '@repo/types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'] & {
  career_stats?: {
    competitions_entered: number;
    competitions_won: number;
    gold_medals: number;
    silver_medals: number;
    bronze_medals: number;
    events_competed: number;
  } | null;
};

interface PersonalBest {
  id: string;
  event_name: string | null;
  category_name: string | null;
  best_value: number | null;
  result_type: string | null;
  achieved_at: string | null;
}

function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const pts = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

function StatPill({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="flex-1 items-center rounded-lg bg-neutral-50 px-2 py-3">
      <Text className="text-lg font-bold text-neutral-900">{value}</Text>
      <Text className="text-xs text-neutral-500 text-center mt-0.5">{label}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { profile: authProfile } = useAuthStore();
  const router = useRouter();

  const { data: profileData, refetch, isRefetching } = useQuery({
    queryKey: ['profile', authProfile?.id],
    queryFn: async () => {
      const { data } = await getProfile(supabase, authProfile?.id ?? '');
      return data as ProfileRow | null;
    },
    enabled: !!authProfile?.id,
  });

  const { data: pbData } = useQuery({
    queryKey: ['profile', authProfile?.id, 'personal-bests'],
    queryFn: async () => {
      const { data } = await getPersonalBests(supabase, authProfile?.id ?? '');
      return (data ?? []) as PersonalBest[];
    },
    enabled: !!authProfile?.id,
  });

  const profile = profileData;
  const personalBests = pbData ?? [];
  const stats = profile?.career_stats;
  const flag = getFlagEmoji(profile?.country_code ?? null);

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
      >
        {/* Header */}
        <View className="bg-white px-4 pt-6 pb-5 border-b border-neutral-200">
          <View className="flex-row items-start justify-between mb-4">
            <View className="flex-row items-center gap-4">
              <View className="w-20 h-20 rounded-full bg-neutral-200 overflow-hidden border-4 border-white shadow">
                {profile?.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80 }} />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-primary-muted items-center justify-center">
                    <Text className="text-3xl font-bold text-primary">
                      {(profile?.display_name?.[0] ?? '?').toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-neutral-900">
                  {profile?.display_name ?? '-'}
                  {flag ? ` ${flag}` : ''}
                </Text>
                {profile?.city ? (
                  <Text className="text-sm text-neutral-500">{profile.city}</Text>
                ) : null}
                {profile?.bio ? (
                  <Text className="text-sm text-neutral-600 mt-1" numberOfLines={2}>
                    {profile.bio}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              className="border border-neutral-200 rounded-lg p-2"
              onPress={() => router.push('/(app)/profile/settings' as never)}
            >
              <Settings size={18} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {stats && (
            <View className="flex-row gap-2">
              <StatPill label="Competed" value={stats.competitions_entered} />
              <StatPill label="Wins" value={stats.competitions_won} />
              <StatPill label="🥇" value={stats.gold_medals} />
              <StatPill label="🥈" value={stats.silver_medals} />
              <StatPill label="🥉" value={stats.bronze_medals} />
              <StatPill label="Events" value={stats.events_competed} />
            </View>
          )}
        </View>

        {/* Personal bests */}
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
                      {pb.event_name ?? 'Unknown event'}
                    </Text>
                    <Text className="text-xs text-neutral-500">{pb.category_name}</Text>
                  </View>
                  <Text className="text-sm font-semibold font-mono text-neutral-700">
                    {pb.best_value ?? '-'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
