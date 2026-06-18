// Other user's profile — avatar, stats, personal bests, Message button.
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { MessageCircle } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getProfile, getPersonalBests } from '@repo/supabase';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
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

  // Build conversation ID as sorted pair
  const conversationId = [myProfile?.id ?? '', profileId].sort().join('_');

  return (
    <SafeAreaView className="flex-1 bg-neutral-50">
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
            {!isOwnProfile && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 border border-neutral-200 rounded-lg px-3 py-2 ml-2"
                onPress={() => router.push(MOBILE_ROUTES.MESSAGE_THREAD(conversationId))}
              >
                <MessageCircle size={16} color="#2D6A4F" />
                <Text className="text-sm font-medium text-neutral-700">Message</Text>
              </TouchableOpacity>
            )}
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
                    {pb.best_value ?? '—'}
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
