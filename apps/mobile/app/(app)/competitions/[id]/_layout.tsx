// Competition detail layout — fetches competition + membership, renders header + top tabs.
import { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { CompetitionHeader } from '@/components/competition/CompetitionHeader';
import { useAuthStore } from '@/stores/auth';
import { useCompetitionStore } from '@/stores/competition';
import { supabase } from '@/lib/supabase/client';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import { MOBILE_ROUTES } from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

export default function CompetitionDetailLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuthStore();
  const { setActiveCompetition } = useCompetitionStore();

  const { data: competitionData, isLoading: compLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data } = await getCompetition(supabase, id);
      return data as CompetitionRow | null;
    },
    enabled: !!id,
  });

  const { data: membersData } = useQuery({
    queryKey: ['competition', id, 'members'],
    queryFn: async () => {
      const { data } = await getCompetitionMembers(supabase, id);
      return (data ?? []) as MemberRow[];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (competitionData) setActiveCompetition(competitionData);
    return () => setActiveCompetition(null);
  }, [competitionData, setActiveCompetition]);

  if (compLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <ActivityIndicator color="#2D6A4F" />
      </SafeAreaView>
    );
  }

  if (!competitionData) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center">
        <Text className="text-neutral-500">Competition not found</Text>
      </SafeAreaView>
    );
  }

  const members = membersData ?? [];
  const currentMember = members.find((m) => m.profile_id === profile?.id) ?? null;
  const isHost = competitionData.host_id === profile?.id;
  const isCohost = competitionData.cohost_id === profile?.id;
  const isFinished =
    competitionData.status === 'complete' || competitionData.status === 'archived';

  const tabs: { label: string; path: string }[] = [
    { label: 'Feed', path: MOBILE_ROUTES.COMPETITION_FEED(id) },
    { label: 'Leaderboard', path: MOBILE_ROUTES.COMPETITION_LEADERBOARD(id) },
    { label: 'Events', path: MOBILE_ROUTES.COMPETITION_EVENTS(id) },
    { label: 'Chat', path: MOBILE_ROUTES.COMPETITION_CHAT(id) },
    { label: 'Members', path: MOBILE_ROUTES.COMPETITION_MEMBERS(id) },
    ...(isFinished ? [{ label: 'Podium', path: MOBILE_ROUTES.COMPETITION_PODIUM(id) }] : []),
    ...(isHost || isCohost
      ? [{ label: 'Settings', path: MOBILE_ROUTES.COMPETITION_SETTINGS(id) }]
      : []),
  ];

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />

      <CompetitionHeader
        competition={competitionData}
        currentMember={currentMember}
        memberCount={members.length}
        profileId={profile?.id ?? ''}
      />

      {/* Top tab bar */}
      <View className="bg-white border-b border-neutral-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4"
        >
          {tabs.map((tab) => {
            const active = pathname === tab.path || pathname.startsWith(tab.path);
            return (
              <TouchableOpacity
                key={tab.label}
                onPress={() => router.push(tab.path)}
                className={`mr-6 py-3 border-b-2 ${active ? 'border-primary' : 'border-transparent'}`}
              >
                <Text
                  className={`text-sm font-semibold ${active ? 'text-primary' : 'text-neutral-500'}`}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Stack screenOptions={{ headerShown: false }} />
    </SafeAreaView>
  );
}
