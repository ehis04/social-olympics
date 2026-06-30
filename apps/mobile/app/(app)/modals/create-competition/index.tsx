// 4-step competition creation modal — mirrors web CreateCompetitionForm logic.
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, Check, X, Trophy } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { getEventsLibrary } from '@repo/supabase';
import { supabase } from '@/lib/supabase/client';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { MOBILE_ROUTES } from '@/constants/routes';
import type { Database } from '@repo/types';

type EventRow = Database['public']['Tables']['events']['Row'];
type WeightTag = 'not_important' | 'standard' | 'important' | 'very_important' | 'custom';

interface FormState {
  name: string;
  description: string;
  is_public: boolean;
  country_code: string;
  city: string;
  prize_pot_per_person: string;
  selectedEventIds: string[];
  min_events_required: number;
  eventWeights: Record<string, { weight_tag: WeightTag; weight_multiplier: number }>;
  mvp_voting_enabled: boolean;
  worst_performer_enabled: boolean;
}

const WEIGHT_OPTIONS: { label: string; tag: WeightTag; multiplier: number }[] = [
  { label: 'Not Important (0.5×)', tag: 'not_important', multiplier: 0.5 },
  { label: 'Standard (1×)', tag: 'standard', multiplier: 1.0 },
  { label: 'Important (1.5×)', tag: 'important', multiplier: 1.5 },
  { label: 'Very Important (2×)', tag: 'very_important', multiplier: 2.0 },
  { label: 'Custom', tag: 'custom', multiplier: 1.0 },
];

const COUNTRY_OPTIONS = [
  { label: 'Ireland', value: 'IE' },
  { label: 'United Kingdom', value: 'GB' },
  { label: 'United States', value: 'US' },
  { label: 'Germany', value: 'DE' },
  { label: 'France', value: 'FR' },
  { label: 'Spain', value: 'ES' },
  { label: 'Italy', value: 'IT' },
  { label: 'Australia', value: 'AU' },
  { label: 'Canada', value: 'CA' },
];

const STEP_LABELS = ['Basic Info', 'Events', 'Weighting', 'Review'];

export default function CreateCompetitionModal() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [eventSearch, setEventSearch] = useState('');

  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    is_public: true,
    country_code: '',
    city: '',
    prize_pot_per_person: '',
    selectedEventIds: [],
    min_events_required: 1,
    eventWeights: {},
    mvp_voting_enabled: true,
    worst_performer_enabled: true,
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events-library'],
    queryFn: async () => {
      const { data } = await getEventsLibrary(supabase);
      return (data ?? []) as (EventRow & { event_categories?: { name: string; slug: string } | null })[];
    },
  });

  const allEvents = eventsData ?? [];

  const filteredEvents = eventSearch.trim()
    ? allEvents.filter((e) => e.name.toLowerCase().includes(eventSearch.toLowerCase()))
    : allEvents;

  const eventsByCategory = filteredEvents.reduce<
    Record<string, (EventRow & { event_categories?: { name: string; slug: string } | null })[]>
  >((acc, event) => {
    const cat = event.event_categories?.name ?? 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat]!.push(event);
    return acc;
  }, {});

  const sections = Object.entries(eventsByCategory).map(([title, data]) => ({ title, data }));

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function toggleEvent(eventId: string) {
    const isSelected = form.selectedEventIds.includes(eventId);
    const newSelected = isSelected
      ? form.selectedEventIds.filter((id) => id !== eventId)
      : [...form.selectedEventIds, eventId];

    const newWeights = { ...form.eventWeights };
    if (!isSelected && !newWeights[eventId]) {
      newWeights[eventId] = { weight_tag: 'standard', weight_multiplier: 1.0 };
    }

    setForm((prev) => ({
      ...prev,
      selectedEventIds: newSelected,
      eventWeights: newWeights,
      min_events_required: Math.min(prev.min_events_required, newSelected.length || 1),
    }));
  }

  function validateStep1(): boolean {
    const errs: Record<string, string> = {};
    if (!form.name.trim() || form.name.trim().length < 3)
      errs['name'] = 'Name must be at least 3 characters';
    if (form.name.trim().length > 60)
      errs['name'] = 'Name must be 60 characters or fewer';
    if (form.description.length > 500)
      errs['description'] = 'Description must be 500 characters or fewer';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function validateStep2(): boolean {
    if (form.selectedEventIds.length === 0) {
      setErrors({ selectedEventIds: 'Select at least one event' });
      return false;
    }
    return true;
  }

  function handleNext() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => s + 1);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        is_public: form.is_public,
        ...(form.country_code && { country_code: form.country_code }),
        ...(form.city.trim() && { city: form.city.trim() }),
        ...(form.prize_pot_per_person && {
          prize_pot_per_person: parseFloat(form.prize_pot_per_person),
        }),
        min_events_required: form.min_events_required,
        mvp_voting_enabled: form.mvp_voting_enabled,
        worst_performer_enabled: form.worst_performer_enabled,
        selectedEventIds: form.selectedEventIds,
        eventWeights: form.eventWeights,
      };

      const { data, error } = await apiCall<{ id: string }>('/api/competitions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (error || !data) {
        toast.error(error?.message ?? 'Failed to create competition');
        return;
      }

      toast.success('Competition created!');
      router.dismiss();
      router.push(MOBILE_ROUTES.COMPETITION_FEED(data.id));
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <TouchableOpacity onPress={() => router.dismiss()}>
          <X size={22} color="#6B7280" />
        </TouchableOpacity>
        <Text className="text-base font-bold text-neutral-800">Create Competition</Text>
        <View className="w-6" />
      </View>

      {/* Step indicator */}
      <View className="flex-row items-center px-4 py-3 border-b border-neutral-100">
        {STEP_LABELS.map((label, i) => {
          const stepNum = i + 1;
          const done = stepNum < step;
          const active = stepNum === step;
          return (
            <View key={label} className="flex-row items-center">
              <View
                className={`w-6 h-6 rounded-full items-center justify-center ${
                  done || active ? 'bg-primary' : 'bg-neutral-100'
                }`}
              >
                {done ? (
                  <Check size={12} color="#fff" />
                ) : (
                  <Text className={`text-xs font-bold ${active ? 'text-white' : 'text-neutral-400'}`}>
                    {stepNum}
                  </Text>
                )}
              </View>
              <Text
                className={`ml-1 text-xs font-semibold ${
                  active ? 'text-neutral-800' : done ? 'text-primary' : 'text-neutral-400'
                }`}
              >
                {label}
              </Text>
              {i < STEP_LABELS.length - 1 && (
                <ChevronRight size={14} color="#D1D5DB" style={{ marginHorizontal: 4 }} />
              )}
            </View>
          );
        })}
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-5"
          keyboardShouldPersistTaps="handled"
        >
          {/* STEP 1 — Basic Info */}
          {step === 1 && (
            <View className="gap-5">
              <View>
                <Text className="text-sm font-semibold text-neutral-700 mb-1">
                  Competition name <Text className="text-error">*</Text>
                </Text>
                <TextInput
                  className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                  placeholder="e.g. Office Olympics 2025"
                  maxLength={60}
                  value={form.name}
                  onChangeText={(v) => update('name', v)}
                />
                {errors['name'] ? (
                  <Text className="text-error text-xs mt-1">{errors['name']}</Text>
                ) : null}
              </View>

              <View>
                <Text className="text-sm font-semibold text-neutral-700 mb-1">
                  Description <Text className="text-neutral-400 font-normal">(optional)</Text>
                </Text>
                <TextInput
                  className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                  placeholder="Describe your competition…"
                  maxLength={500}
                  multiline
                  numberOfLines={3}
                  value={form.description}
                  onChangeText={(v) => update('description', v)}
                  textAlignVertical="top"
                />
                <Text className="text-right text-xs text-neutral-400 mt-1">
                  {form.description.length}/500
                </Text>
              </View>

              <View>
                <Text className="text-sm font-semibold text-neutral-700 mb-2">Visibility</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className={`flex-1 rounded-lg border py-3 items-center ${
                      form.is_public ? 'border-primary bg-primary-muted' : 'border-neutral-200'
                    }`}
                    onPress={() => update('is_public', true)}
                  >
                    <Text className={`text-sm font-semibold ${form.is_public ? 'text-primary' : 'text-neutral-600'}`}>
                      Public
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 rounded-lg border py-3 items-center ${
                      !form.is_public ? 'border-primary bg-primary-muted' : 'border-neutral-200'
                    }`}
                    onPress={() => update('is_public', false)}
                  >
                    <Text className={`text-sm font-semibold ${!form.is_public ? 'text-primary' : 'text-neutral-600'}`}>
                      Private
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text className="text-xs text-neutral-400 mt-1.5">
                  {form.is_public
                    ? 'Anyone can find and join from Discover.'
                    : 'Only people with the invite link can join.'}
                </Text>
              </View>

              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-700 mb-1">Country</Text>
                  <ScrollView
                    className="border border-neutral-200 rounded-lg bg-neutral-50 max-h-32"
                    nestedScrollEnabled
                  >
                    <TouchableOpacity
                      className={`px-3 py-2 ${form.country_code === '' ? 'bg-primary-muted' : ''}`}
                      onPress={() => update('country_code', '')}
                    >
                      <Text className={`text-sm ${form.country_code === '' ? 'text-primary font-semibold' : 'text-neutral-600'}`}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {COUNTRY_OPTIONS.map((c) => (
                      <TouchableOpacity
                        key={c.value}
                        className={`px-3 py-2 ${form.country_code === c.value ? 'bg-primary-muted' : ''}`}
                        onPress={() => update('country_code', c.value)}
                      >
                        <Text className={`text-sm ${form.country_code === c.value ? 'text-primary font-semibold' : 'text-neutral-600'}`}>
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-neutral-700 mb-1">City</Text>
                  <TextInput
                    className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                    placeholder="e.g. Dublin"
                    value={form.city}
                    onChangeText={(v) => update('city', v)}
                  />
                </View>
              </View>

              <View>
                <Text className="text-sm font-semibold text-neutral-700 mb-1">
                  Suggested contribution per player (€){' '}
                  <Text className="text-neutral-400 font-normal">(optional)</Text>
                </Text>
                <TextInput
                  className="border border-neutral-200 rounded-lg px-4 py-3 text-neutral-800 bg-neutral-50"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={form.prize_pot_per_person}
                  onChangeText={(v) => update('prize_pot_per_person', v)}
                />
                <Text className="text-xs text-neutral-400 mt-1">
                  Informational only: the platform does not process payments.
                </Text>
              </View>
            </View>
          )}

          {/* STEP 2 — Event Selection */}
          {step === 2 && (
            <View>
              <Text className="text-sm text-neutral-600 mb-4">
                Select the events for your competition.
              </Text>
              {errors['selectedEventIds'] ? (
                <Text className="text-error text-sm mb-3">{errors['selectedEventIds']}</Text>
              ) : null}

              <View className="flex-row items-center border border-neutral-200 rounded-lg px-3 py-2 bg-neutral-50 mb-4">
                <TextInput
                  className="flex-1 text-sm text-neutral-800"
                  placeholder="Search events…"
                  value={eventSearch}
                  onChangeText={setEventSearch}
                />
              </View>

              {sections.map(({ title, data }) => (
                <View key={title} className="mb-4">
                  <Text className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    {title}
                  </Text>
                  {data.map((event) => {
                    const selected = form.selectedEventIds.includes(event.id);
                    return (
                      <TouchableOpacity
                        key={event.id}
                        className={`flex-row items-center px-3 py-2.5 rounded-lg mb-1 ${
                          selected ? 'bg-primary-muted' : 'bg-neutral-50'
                        }`}
                        onPress={() => toggleEvent(event.id)}
                      >
                        <View
                          className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                            selected ? 'bg-primary border-primary' : 'border-neutral-300'
                          }`}
                        >
                          {selected && <Check size={12} color="#fff" />}
                        </View>
                        <Text className="flex-1 text-sm text-neutral-800">{event.name}</Text>
                        <Text className="text-xs text-neutral-400">{event.result_type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}

              {form.selectedEventIds.length > 0 && (
                <View className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 mt-2">
                  <Text className="text-sm font-semibold text-neutral-700 mb-3">
                    {form.selectedEventIds.length} event
                    {form.selectedEventIds.length !== 1 ? 's' : ''} selected
                  </Text>
                  <Text className="text-sm font-semibold text-neutral-700 mb-1">
                    Minimum events each competitor must complete
                  </Text>
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity
                      className="w-9 h-9 rounded-lg border border-neutral-200 items-center justify-center bg-white"
                      onPress={() =>
                        update('min_events_required', Math.max(1, form.min_events_required - 1))
                      }
                    >
                      <Text className="text-lg font-semibold text-neutral-700">−</Text>
                    </TouchableOpacity>
                    <Text className="text-base font-bold text-neutral-800 w-8 text-center">
                      {form.min_events_required}
                    </Text>
                    <TouchableOpacity
                      className="w-9 h-9 rounded-lg border border-neutral-200 items-center justify-center bg-white"
                      onPress={() =>
                        update(
                          'min_events_required',
                          Math.min(form.selectedEventIds.length, form.min_events_required + 1)
                        )
                      }
                    >
                      <Text className="text-lg font-semibold text-neutral-700">+</Text>
                    </TouchableOpacity>
                  </View>
                  <Text className="text-xs text-neutral-400 mt-2">
                    Best {form.min_events_required} result
                    {form.min_events_required !== 1 ? 's' : ''} count toward each competitor's total.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* STEP 3 — Weighting + Voting */}
          {step === 3 && (
            <View className="gap-5">
              <View className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 gap-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-800">Enable MVP voting</Text>
                    <Text className="text-xs text-neutral-500">Winner gets +1 bonus point</Text>
                  </View>
                  <Switch
                    value={form.mvp_voting_enabled}
                    onValueChange={(v) => update('mvp_voting_enabled', v)}
                    trackColor={{ true: '#2D6A4F' }}
                  />
                </View>
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-neutral-800">
                      Enable worst performer voting
                    </Text>
                    <Text className="text-xs text-neutral-500">Last place gets -1 point penalty</Text>
                  </View>
                  <Switch
                    value={form.worst_performer_enabled}
                    onValueChange={(v) => update('worst_performer_enabled', v)}
                    trackColor={{ true: '#2D6A4F' }}
                  />
                </View>
                <Text className="text-xs text-neutral-400">
                  These settings lock once the first event starts.
                </Text>
              </View>

              <Text className="text-sm font-semibold text-neutral-700">Event weights</Text>
              {form.selectedEventIds.map((eventId) => {
                const event = allEvents.find((e) => e.id === eventId);
                if (!event) return null;
                const weight = form.eventWeights[eventId] ?? {
                  weight_tag: 'standard',
                  weight_multiplier: 1.0,
                };
                const firstPlacePoints = (10 * weight.weight_multiplier).toFixed(1);
                return (
                  <View key={eventId} className="rounded-lg border border-neutral-200 p-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-sm font-semibold text-neutral-800 flex-1">
                        {event.name}
                      </Text>
                      <Text className="text-xs text-neutral-400">1st = {firstPlacePoints} pts</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      className="-mx-1"
                    >
                      <View className="flex-row gap-2 px-1">
                        {WEIGHT_OPTIONS.filter((o) => o.tag !== 'custom').map((o) => (
                          <TouchableOpacity
                            key={o.tag}
                            onPress={() =>
                              setForm((prev) => ({
                                ...prev,
                                eventWeights: {
                                  ...prev.eventWeights,
                                  [eventId]: { weight_tag: o.tag, weight_multiplier: o.multiplier },
                                },
                              }))
                            }
                            className={`rounded-full px-3 py-1.5 border ${
                              weight.weight_tag === o.tag
                                ? 'bg-primary border-primary'
                                : 'bg-white border-neutral-200'
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                weight.weight_tag === o.tag ? 'text-white' : 'text-neutral-600'
                              }`}
                            >
                              {o.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                );
              })}
            </View>
          )}

          {/* STEP 4 — Review */}
          {step === 4 && (
            <View className="gap-5">
              <View className="rounded-lg border border-neutral-100 bg-neutral-50 p-4 flex-row items-start gap-3">
                <Trophy size={18} color="#2D6A4F" style={{ marginTop: 2 }} />
                <View className="flex-1">
                  <Text className="text-sm font-bold text-neutral-800">
                    {form.name || 'Your competition'}
                  </Text>
                  <Text className="text-xs text-neutral-500 mt-0.5">
                    {form.selectedEventIds.length} event
                    {form.selectedEventIds.length !== 1 ? 's' : ''} •{' '}
                    {form.is_public ? 'Public' : 'Private'} • Best {form.min_events_required} results
                    count
                  </Text>
                  {(form.city || form.country_code) ? (
                    <Text className="text-xs text-neutral-500 mt-0.5">
                      {[form.city, form.country_code].filter(Boolean).join(', ')}
                    </Text>
                  ) : null}
                </View>
              </View>

              <View className="rounded-lg border border-neutral-200 p-4 gap-3">
                <Text className="text-sm font-semibold text-neutral-700">Settings</Text>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-600">MVP voting</Text>
                  <Text className="text-sm font-semibold text-neutral-800">
                    {form.mvp_voting_enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-neutral-600">Worst performer voting</Text>
                  <Text className="text-sm font-semibold text-neutral-800">
                    {form.worst_performer_enabled ? 'Enabled' : 'Disabled'}
                  </Text>
                </View>
                {form.prize_pot_per_person ? (
                  <View className="flex-row justify-between">
                    <Text className="text-sm text-neutral-600">Prize pot per person</Text>
                    <Text className="text-sm font-semibold text-neutral-800">
                      €{form.prize_pot_per_person}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text className="text-xs text-neutral-400 text-center">
                You'll be able to invite members and share the invite code after creation.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Navigation */}
        <View className="flex-row items-center justify-between px-4 py-3 border-t border-neutral-100 bg-white">
          <TouchableOpacity
            className="flex-row items-center gap-1.5 px-4 py-2.5 rounded-lg"
            onPress={() => (step === 1 ? router.dismiss() : setStep((s) => s - 1))}
          >
            <ChevronLeft size={16} color="#6B7280" />
            <Text className="text-sm font-semibold text-neutral-600">
              {step === 1 ? 'Cancel' : 'Back'}
            </Text>
          </TouchableOpacity>

          {step < 4 ? (
            <TouchableOpacity
              className="flex-row items-center gap-1.5 bg-primary px-5 py-2.5 rounded-lg"
              onPress={handleNext}
            >
              <Text className="text-sm font-semibold text-white">Next</Text>
              <ChevronRight size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="bg-primary px-6 py-2.5 rounded-lg"
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-sm font-semibold text-white">Create Competition</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
