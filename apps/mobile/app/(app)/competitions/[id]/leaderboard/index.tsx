/*
 * This file defines the index module.
 */

// Leaderboard screen — realtime ranked entries with individual/team toggle.
import { useEffect, useState } from 'react';
import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { supabase } from '@/lib/supabase/client';
import { getLeaderboard, getTeamLeaderboard, subscribeLeaderboard } from '@repo/supabase';
import { rankStandings } from '@repo/scoring';
import { useAuthStore } from '@/stores/auth';
import { MOBILE_ROUTES } from '@/constants/routes';
import { formatPoints } from '@/utils/formatters/points';
import { apiCall } from '@/lib/api/client';

interface LeaderboardMember {
  profile_id: string;
  role?: string | null;
  status?: string | null;
  total_points: number | null;
  gold_count: number | null;
  silver_count: number | null;
  bronze_count: number | null;
  events_completed: number | null;
  final_rank: number | null;
  profiles: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    country_code: string | null;
  } | null;
}

interface RankedMember extends LeaderboardMember {
  rank: number;
  isTied: boolean;
}

interface TeamRow {
  team_id: string;
  team_name: string;
  total_points: number;
  rank: number;
}

type Tab = 'individual' | 'team';

// Handles get flag emoji.
function getFlagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return '';
  const pts = code.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...pts);
}

// Ranks members the same way as the web leaderboard and final places: points, then medals.
function rankMembers(members: LeaderboardMember[]): RankedMember[] {
  return rankStandings(
    members.map((member) => ({
      ...member,
      total_points: Number(member.total_points ?? 0),
      gold_count: member.gold_count ?? 0,
      silver_count: member.silver_count ?? 0,
      bronze_count: member.bronze_count ?? 0,
    })),
  );
}

// Renders the medal tally component.
function MedalTally({ gold, silver, bronze }: { gold: number; silver: number; bronze: number }) {
  if (gold === 0 && silver === 0 && bronze === 0) return null;
  return (
    <Text className="text-xs text-neutral-500">
      {gold > 0 ? `🥇${gold} ` : ''}
      {silver > 0 ? `🥈${silver} ` : ''}
      {bronze > 0 ? `🥉${bronze}` : ''}
    </Text>
  );
}

// Renders the leaderboard screen component.
export default function LeaderboardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const [tab, setTab] = useState<Tab>('individual');
  const [entries, setEntries] = useState<RankedMember[]>([]);

  const { data: leaderboardData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['competition', id, 'leaderboard'],
    queryFn: async () => {
      const { data } = await getLeaderboard(supabase, id);
      // Competitors appear on the board; people who left keep their place if they already scored.
      return ((data ?? []) as LeaderboardMember[]).filter((member) =>
        member.role === 'competitor' &&
        (member.status === 'active' || (member.status === 'withdrawn' && (member.events_completed ?? 0) > 0)),
      );
    },
    enabled: !!id,
  });

  const { data: teamData } = useQuery({
    queryKey: ['competition', id, 'team-leaderboard'],
    queryFn: async () => {
      const { data } = await getTeamLeaderboard(supabase, id);
      return (data ?? []) as TeamRow[];
    },
    enabled: !!id && tab === 'team',
  });

  // Tied competitors are prompted to make their sealed tiebreaker nomination.
  const { data: tiebreakers } = useQuery({
    queryKey: ['competition', id, 'tiebreakers'],
    queryFn: async () => {
      const { data } = await apiCall<{ id: string; profileIdA: string; profileIdB: string; status: string; viewerNominated: boolean }[]>(
        `/api/competitions/${id}/tiebreakers`,
      );
      return data ?? [];
    },
    enabled: !!id,
  });
  const awaitingNomination = (tiebreakers ?? []).find((tb) =>
    [tb.profileIdA, tb.profileIdB].includes(profile?.id ?? '') &&
    (tb.status === 'pending_nomination' || tb.status === 'nominated') &&
    !tb.viewerNominated,
  );

  useEffect(() => {
    if (!leaderboardData) return;
    setEntries(rankMembers(leaderboardData));
  }, [leaderboardData]);

  useEffect(() => {
    const unsubscribe = subscribeLeaderboard(supabase, id, (updated) => {
      const u = updated as Partial<LeaderboardMember> & { profile_id: string };
      setEntries((prev) => {
        const merged = prev.map((m) =>
          m.profile_id === u.profile_id ? { ...m, ...u } : m
        );
        return rankMembers(merged);
      });
    });
    return () => unsubscribe();
  }, [id]);

  function renderEntry({ item }: { item: RankedMember }) {
    const isMe = item.profile_id === profile?.id;
    const displayName = item.profiles?.display_name ?? 'Unknown';
    const flag = getFlagEmoji(item.profiles?.country_code ?? null);

    return (
      <TouchableOpacity
        className={`flex-row items-center px-4 py-3 border-b border-neutral-100 ${
          isMe ? 'bg-primary-muted/30' : item.isTied ? 'bg-yellow-50' : 'bg-white'
        }`}
        onPress={() => router.push(MOBILE_ROUTES.PROFILE(item.profile_id))}
        activeOpacity={0.7}
      >
        <View className="w-10 items-center">
          <Text className="text-sm font-mono font-semibold text-neutral-700">
            {item.isTied ? '=' : ''}{item.rank}
          </Text>
        </View>

        <View className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden mr-3">
          {item.profiles?.avatar_url ? (
            <Image source={{ uri: item.profiles.avatar_url }} style={{ width: 32, height: 32 }} />
          ) : (
            <View className="w-8 h-8 rounded-full bg-primary-muted items-center justify-center">
              <Text className="text-xs font-bold text-primary">
                {(displayName[0] ?? '?').toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View className="flex-1 min-w-0">
          <Text className="text-sm font-medium text-neutral-900" numberOfLines={1}>
            {displayName}
            {flag ? ` ${flag}` : ''}
            {isMe ? <Text className="text-xs text-primary"> (you)</Text> : null}
          </Text>
          <MedalTally
            gold={item.gold_count ?? 0}
            silver={item.silver_count ?? 0}
            bronze={item.bronze_count ?? 0}
          />
        </View>

        <View className="items-end">
          <Text className="text-sm font-semibold font-mono text-neutral-900">
            {formatPoints(item.total_points ?? 0)}
          </Text>
          <Text className="text-xs text-neutral-400">
            {item.events_completed ?? 0} events
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderTeam({ item, index }: { item: TeamRow; index: number }) {
    return (
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100 bg-white">
        <View className="w-10 items-center">
          <Text className="text-sm font-bold text-neutral-700">{item.rank || index + 1}</Text>
        </View>
        <Text className="flex-1 text-sm font-medium text-neutral-800">{item.team_name}</Text>
        <Text className="text-sm font-semibold text-neutral-900">
          {formatPoints(item.total_points)}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      {/* Tab toggle */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-neutral-200">
        <Text className="text-base font-bold text-neutral-800">Leaderboard</Text>
        <View className="flex-row border border-neutral-200 rounded-lg overflow-hidden">
          {(['individual', 'team'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              className={`px-3 py-1.5 ${tab === t ? 'bg-primary' : 'bg-white'}`}
              onPress={() => setTab(t)}
            >
              <Text className={`text-xs font-semibold capitalize ${tab === t ? 'text-white' : 'text-neutral-600'}`}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {awaitingNomination && (
        <TouchableOpacity
          className="mx-4 mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          onPress={() => router.push({
            pathname: MOBILE_ROUTES.MODAL_TIEBREAKER,
            params: { competitionId: id, tiebreakerId: awaitingNomination.id },
          })}
        >
          <Text className="text-sm font-semibold text-amber-900">You are in a tiebreaker</Text>
          <Text className="text-xs text-amber-800">Tap to nominate an event you both competed in.</Text>
        </TouchableOpacity>
      )}

      {tab === 'individual' ? (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.profile_id}
          renderItem={renderEntry}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
          }
          ListHeaderComponent={
            <View className="px-4 py-2 bg-neutral-50 border-b border-neutral-100 flex-row gap-2">
              <Text className="w-10 text-xs font-semibold uppercase text-neutral-400">Rank</Text>
              <Text className="flex-1 text-xs font-semibold uppercase text-neutral-400">Competitor</Text>
              <Text className="text-xs font-semibold uppercase text-neutral-400">Points</Text>
            </View>
          }
          ListEmptyComponent={
            !isLoading ? (
              <View className="items-center py-20">
                <Text className="text-neutral-500 text-sm">No results yet.</Text>
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={teamData ?? []}
          keyExtractor={(item) => item.team_id}
          renderItem={renderTeam}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Text className="text-neutral-500 text-sm">No team results yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
