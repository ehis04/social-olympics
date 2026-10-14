/*
 * This file defines the HostRecorderPanel user-interface component.
 */

// HostRecorderPanel — host records and confirms everyone's results at once, for events run in person.
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch, ActivityIndicator, Alert } from 'react-native';
import { X } from 'lucide-react-native';
import { formatResultForInput, getResultInputConfig, parseResultInput } from '@repo/scoring';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerError, triggerSuccess } from '@/utils/helpers/haptics';

export interface RecorderParticipant {
  profileId: string;
  displayName: string;
}

export interface ExistingEntry {
  profileId: string;
  value: number | null;
  isDnf: boolean;
  notes: string | null;
}

interface Entry {
  included: boolean;
  value: string;
  isDnf: boolean;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  resultType: string;
  participants: RecorderParticipant[];
  // Results already submitted, used to pre-fill the form.
  existing: ExistingEntry[];
  // People taking part by default: assigned participants and submitters, or everyone.
  defaultIncluded: string[];
  onClose: () => void;
  onRecorded: () => void;
}

// Renders the host recorder panel component.
export function HostRecorderPanel({
  competitionId,
  competitionEventId,
  resultType,
  participants,
  existing,
  defaultIncluded,
  onClose,
  onRecorded,
}: Props) {
  const config = getResultInputConfig(resultType);
  const [isSaving, setIsSaving] = useState(false);
  const [entries, setEntries] = useState<Record<string, Entry>>(() => {
    const included = new Set(defaultIncluded);
    return Object.fromEntries(
      participants.map((participant) => {
        const prior = existing.find((entry) => entry.profileId === participant.profileId);
        return [participant.profileId, {
          included: included.has(participant.profileId),
          value: prior && !prior.isDnf ? formatResultForInput(resultType, prior.value) : '',
          isDnf: prior?.isDnf ?? false,
        }];
      }),
    );
  });

  function update(profileId: string, change: Partial<Entry>) {
    setEntries((current) => ({ ...current, [profileId]: { ...current[profileId]!, ...change } }));
  }

  async function save() {
    const included = participants.filter((participant) => entries[participant.profileId]?.included);
    if (included.length === 0) {
      toast.error('Include at least one participant');
      return;
    }
    const missing = included.filter((participant) => {
      const entry = entries[participant.profileId]!;
      return !entry.isDnf && parseResultInput(resultType, entry.value) === null;
    });
    if (missing.length > 0) {
      toast.error(`Enter a valid ${config.label.toLowerCase()} or mark DNF for ${missing.map((m) => m.displayName).join(', ')}`);
      triggerError();
      return;
    }

    setIsSaving(true);
    const { error } = await apiCall(`/api/competitions/${competitionId}/events/${competitionEventId}/record`, {
      method: 'POST',
      body: JSON.stringify({
        results: included.map((participant) => {
          const entry = entries[participant.profileId]!;
          return {
            profileId: participant.profileId,
            value: entry.isDnf ? null : parseResultInput(resultType, entry.value),
            isDnf: entry.isDnf,
          };
        }),
      }),
    });
    setIsSaving(false);
    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }
    triggerSuccess();
    toast.success('Results recorded and confirmed');
    onRecorded();
  }

  function confirmSave() {
    Alert.alert(
      'Record and confirm results?',
      'Places and points are worked out from these results and confirmed straight away. Anyone left out is not scored in this event.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => void save() },
      ],
    );
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <Text className="text-sm font-semibold text-neutral-900">Record results</Text>
        <TouchableOpacity onPress={onClose} className="p-1" accessibilityLabel="Close">
          <X size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>
      <View className="p-4 gap-3">
        <Text className="text-xs text-neutral-500">
          Enter each participant&apos;s {config.label.toLowerCase()}{config.unit ? ` in ${config.unit}` : ''}
          {config.help ? `. ${config.help}` : '.'} Switch people off if they did not take part.
        </Text>
        {participants.map((participant) => {
          const entry = entries[participant.profileId]!;
          return (
            <View key={participant.profileId} className={`border-t border-neutral-100 pt-3 gap-2 ${entry.included ? '' : 'opacity-50'}`}>
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-medium text-neutral-800 flex-1" numberOfLines={1}>{participant.displayName}</Text>
                <Switch
                  value={entry.included}
                  onValueChange={(included) => update(participant.profileId, { included })}
                  trackColor={{ true: '#2D6A4F' }}
                  accessibilityLabel={`Include ${participant.displayName}`}
                />
              </View>
              {entry.included && (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className={`flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm ${entry.isDnf ? 'opacity-40' : ''}`}
                    editable={!entry.isDnf}
                    keyboardType={config.inputMode === 'text' ? 'numbers-and-punctuation' : config.inputMode === 'numeric' ? 'number-pad' : 'decimal-pad'}
                    placeholder={config.placeholder}
                    value={entry.value}
                    onChangeText={(value) => update(participant.profileId, { value })}
                    accessibilityLabel={`${config.label} for ${participant.displayName}`}
                  />
                  <Text className="text-xs text-neutral-600">DNF</Text>
                  <Switch
                    value={entry.isDnf}
                    onValueChange={(isDnf) => update(participant.profileId, { isDnf })}
                    trackColor={{ true: '#EF4444' }}
                  />
                </View>
              )}
            </View>
          );
        })}
        <TouchableOpacity
          className="bg-primary rounded-lg py-3 items-center mt-2"
          onPress={confirmSave}
          disabled={isSaving}
        >
          {isSaving ? <ActivityIndicator color="#fff" /> : (
            <Text className="text-white font-semibold text-sm">Record and confirm</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
