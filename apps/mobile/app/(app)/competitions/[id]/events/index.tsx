// Events list screen — all competition events with status, host start/add controls.
import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Calendar } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getCompetitionEvents, getCompetition } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MOBILE_ROUTES } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type CompetitionEventStatus = Database['public']['Enums']['competition_event_status'];

interface CompetitionEvent {
  id: string;
  sequence_order: number | null;
  status: CompetitionEventStatus | null;
  weight_tag: string | null;
  weight_multiplier: number | null;
  events: {
    name: string | null;
    result_type: string | null;
    event_categories: { name: string | null; slug: string | null } | null;
  } | null;
}

export default function EventsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuthStore();
  const queryClient = useQueryClient();
  const [startingId, setStartingId] = useState<string | null>(null);

  const { data: competition } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => {
      const { data } = await getCompetition(supabase, id);
      return data as CompetitionRow | null;
    },
    enabled: !!id,
  });

  const { data: eventsData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['competition', id, 'events'],
    queryFn: async () => {
      const { data } = await getCompetitionEvents(supabase, id);
      return (data ?? []) as CompetitionEvent[];
    },
    enabled: !!id,
  });

  const events = eventsData ?? [];
  const isHost =
    competition?.host_id === profile?.id || competition?.cohost_id === profile?.id;
  const canStartEvents =
    isHost && ['setup', 'open', 'active'].includes(competition?.status ?? '');

  async function handleStart(eventId: string) {
    setStartingId(eventId);
    const { error } = await apiCall(
      `/api/competitions/${id}/events/${eventId}/start`,
      { method: 'POST' }
    );
    setStartingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Event started');
    queryClient.invalidateQueries({ queryKey: ['competition', id, 'events'] });
    router.push(MOBILE_ROUTES.EVENT_DETAIL(id, eventId));
  }

  function renderEvent({ item, index }: { item: CompetitionEvent; index: number }) {
    const eventName = item.events?.name ?? 'Untitled event';
    const category = item.events?.event_categories?.name ?? 'Uncategorised';
    const resultType = item.events?.result_type ?? '';
    const status = item.status ?? 'pending';
    const isPending = status === 'pending';
    const canStart = canStartEvents && isPending && !!item.id;

    return (
      <TouchableOpacity
        className="flex-row items-center px-4 py-3 border-b border-neutral-100 bg-white"
        onPress={() => router.push(MOBILE_ROUTES.EVENT_DETAIL(id, item.id))}
        activeOpacity={0.7}
      >
        <View className="w-8 h-8 rounded-full bg-primary-muted items-center justify-center mr-3">
          <Text className="text-xs font-bold text-primary">
            {item.sequence_order ?? index + 1}
          </Text>
        </View>

        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-2 mb-0.5 flex-wrap">
            <Text className="text-sm font-semibold text-neutral-800" numberOfLines={1}>
              {eventName}
            </Text>
            <StatusBadge status={status as CompetitionEventStatus} />
          </View>
          <Text className="text-xs text-neutral-500">
            {category}
            {resultType ? ` · ${resultType.replace('_', ' ')}` : ''}
            {item.weight_multiplier && item.weight_multiplier !== 1
              ? ` · ${item.weight_multiplier}×`
              : ''}
          </Text>
        </View>

        {canStart && (
          <TouchableOpacity
            className="flex-row items-center gap-1 bg-primary rounded px-3 py-1.5 ml-2"
            onPress={() => handleStart(item.id)}
            disabled={startingId === item.id}
          >
            {startingId === item.id ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Play size={12} color="#fff" />
                <Text className="text-white text-xs font-semibold ml-1">Start</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-neutral-50" edges={['bottom']}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={renderEvent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2D6A4F" />
        }
        ListHeaderComponent={
          <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-neutral-200">
            <View>
              <Text className="text-base font-bold text-neutral-800">Events</Text>
              <Text className="text-xs text-neutral-500">
                {events.length} event{events.length !== 1 ? 's' : ''}
                {competition?.voting_locked ? ' · Voting locked' : ''}
              </Text>
            </View>
            {isHost && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 bg-primary rounded-lg px-3 py-2"
                onPress={() => router.push(MOBILE_ROUTES.MODAL_ADD_EVENT)}
              >
                <Plus size={14} color="#fff" />
                <Text className="text-white text-xs font-semibold">Add Event</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center justify-center py-20">
              <Calendar size={32} color="#D1D5DB" />
              <Text className="text-neutral-500 mt-3 text-sm">No events yet</Text>
              {isHost && (
                <TouchableOpacity
                  className="mt-4 bg-primary rounded-lg px-5 py-2.5"
                  onPress={() => router.push(MOBILE_ROUTES.MODAL_ADD_EVENT)}
                >
                  <Text className="text-white text-sm font-semibold">Add First Event</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
