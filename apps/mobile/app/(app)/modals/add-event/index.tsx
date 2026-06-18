// Add event modal — searchable library grouped by category, with weight tag picker.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase/client';
import { getEventsLibrary } from '@repo/supabase';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type EventRow = Database['public']['Tables']['events']['Row'];
type WeightTag = 'not_important' | 'standard' | 'important' | 'very_important' | 'custom';

const WEIGHT_OPTIONS: { label: string; tag: WeightTag; multiplier: number }[] = [
  { label: 'Not Important (0.5×)', tag: 'not_important', multiplier: 0.5 },
  { label: 'Standard (1×)', tag: 'standard', multiplier: 1.0 },
  { label: 'Important (1.5×)', tag: 'important', multiplier: 1.5 },
  { label: 'Very Important (2×)', tag: 'very_important', multiplier: 2.0 },
];

export default function AddEventModal() {
  const { id: competitionId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<EventRow | null>(null);
  const [weightTag, setWeightTag] = useState<WeightTag>('standard');
  const [weightMultiplier, setWeightMultiplier] = useState(1.0);
  const [adding, setAdding] = useState(false);

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['events-library'],
    queryFn: async () => {
      const { data } = await getEventsLibrary(supabase);
      return (data ?? []) as (EventRow & {
        event_categories?: { name: string; slug: string } | null;
      })[];
    },
  });

  const allEvents = eventsData ?? [];
  const filtered = search.trim()
    ? allEvents.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : allEvents;

  const byCategory = filtered.reduce<
    Record<string, (EventRow & { event_categories?: { name: string; slug: string } | null })[]>
  >((acc, e) => {
    const cat = e.event_categories?.name ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(e);
    return acc;
  }, {});

  async function handleAdd() {
    if (!selectedEvent) return;
    setAdding(true);
    const { error } = await apiCall(`/api/competitions/${competitionId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        event_id: selectedEvent.id,
        weight_tag: weightTag,
        weight_multiplier: weightMultiplier,
      }),
    });
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${selectedEvent.name} added`);
    queryClient.invalidateQueries({ queryKey: ['competition', competitionId, 'events'] });
    router.dismiss();
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.dismiss()}>
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800">Add Event</Text>
        <View className="w-6" />
      </View>

      {!selectedEvent ? (
        <>
          <View className="flex-row items-center border-b border-neutral-200 px-4 py-2">
            <TextInput
              className="flex-1 text-sm text-neutral-800 py-2"
              placeholder="Search events…"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <ScrollView>
            {isLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#2D6A4F" />
              </View>
            ) : (
              Object.entries(byCategory).map(([category, events]) => (
                <View key={category}>
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-400 px-4 py-2 bg-neutral-50">
                    {category}
                  </Text>
                  {events.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      className="flex-row items-center px-4 py-3 border-b border-neutral-100"
                      onPress={() => setSelectedEvent(event)}
                    >
                      <Text className="flex-1 text-sm text-neutral-800">{event.name}</Text>
                      <Text className="text-xs text-neutral-400">{event.result_type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </>
      ) : (
        <ScrollView contentContainerClassName="p-4 gap-5">
          <TouchableOpacity
            className="flex-row items-center gap-1"
            onPress={() => setSelectedEvent(null)}
          >
            <Text className="text-primary text-sm">← Back to list</Text>
          </TouchableOpacity>

          <View className="rounded-lg border border-neutral-200 p-4">
            <Text className="text-base font-bold text-neutral-800">{selectedEvent.name}</Text>
            <Text className="text-xs text-neutral-500 mt-0.5">{selectedEvent.result_type}</Text>
          </View>

          <View>
            <Text className="text-sm font-semibold text-neutral-700 mb-3">Event weight</Text>
            <View className="gap-2">
              {WEIGHT_OPTIONS.map((o) => {
                const firstPlace = (10 * o.multiplier).toFixed(1);
                const isSelected = weightTag === o.tag;
                return (
                  <TouchableOpacity
                    key={o.tag}
                    className={`flex-row items-center justify-between rounded-lg border px-4 py-3 ${
                      isSelected ? 'border-primary bg-primary-muted' : 'border-neutral-200'
                    }`}
                    onPress={() => {
                      setWeightTag(o.tag);
                      setWeightMultiplier(o.multiplier);
                    }}
                  >
                    <Text
                      className={`text-sm font-semibold ${isSelected ? 'text-primary' : 'text-neutral-700'}`}
                    >
                      {o.label}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <Text className="text-xs text-neutral-400">1st = {firstPlace} pts</Text>
                      {isSelected && <Check size={14} color="#2D6A4F" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            className="bg-primary rounded-lg py-4 items-center"
            onPress={handleAdd}
            disabled={adding}
          >
            {adding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-semibold">Add to Competition</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
