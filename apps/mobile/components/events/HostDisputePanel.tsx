/*
 * This file defines the HostDisputePanel user-interface component.
 */

// HostDisputePanel — host reviews open disputes and dismisses, resolves or corrects the result.
import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Switch } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { formatResultForInput, formatResultValue, getResultInputConfig, parseResultInput } from '@repo/scoring';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { formatRelativeTime } from '@/utils/formatters/date';

export interface OpenDispute {
  disputeId: string;
  displayName: string;
  reason: string;
  raisedAt: string;
  resultValue: number | null;
  isDnf: boolean;
  place: number | null;
}

interface Props {
  competitionId: string;
  resultType: string;
  disputes: OpenDispute[];
  onChanged: () => void;
}

// Renders the host dispute panel component.
export function HostDisputePanel({ competitionId, resultType, disputes, onChanged }: Props) {
  const config = getResultInputConfig(resultType);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [isDnf, setIsDnf] = useState(false);
  const [note, setNote] = useState('');

  if (disputes.length === 0) return null;

  function startEditing(dispute: OpenDispute) {
    setEditingId(dispute.disputeId);
    setValue(formatResultForInput(resultType, dispute.resultValue));
    setIsDnf(dispute.isDnf);
    setNote('');
  }

  async function submit(dispute: OpenDispute, action: 'resolve' | 'dismiss', correct: boolean) {
    const payload: Record<string, unknown> = { action, competition_id: competitionId };
    if (note.trim()) payload.note = note.trim();
    if (correct) {
      const parsed = isDnf ? null : parseResultInput(resultType, value);
      if (!isDnf && parsed === null) {
        toast.error(`Enter a valid ${config.label.toLowerCase()} or mark the result as DNF`);
        return;
      }
      payload.result_value = parsed;
      payload.is_dnf = isDnf;
    }

    setBusyId(dispute.disputeId);
    const { error } = await apiCall(`/api/disputes/${dispute.disputeId}/resolve`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setBusyId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(
      action === 'dismiss'
        ? 'Dispute dismissed: the result stands'
        : correct
          ? 'Result corrected and points recalculated'
          : 'Dispute resolved',
    );
    setEditingId(null);
    onChanged();
  }

  return (
    <View className="mx-4 rounded-lg border border-orange-200 bg-orange-50 p-4 gap-3">
      <View className="flex-row items-center gap-2">
        <AlertTriangle size={16} color="#EA580C" />
        <Text className="text-sm font-semibold text-orange-900">
          Open {disputes.length === 1 ? 'dispute' : 'disputes'} ({disputes.length})
        </Text>
      </View>

      {disputes.map((dispute) => {
        const isEditing = editingId === dispute.disputeId;
        const busy = busyId === dispute.disputeId;
        return (
          <View key={dispute.disputeId} className="rounded-lg border border-orange-200 bg-white p-3 gap-2">
            <View className="flex-row justify-between gap-2">
              <Text className="text-sm font-semibold text-neutral-900 flex-1">{dispute.displayName}</Text>
              <Text className="text-xs text-neutral-500">
                {dispute.isDnf ? 'DNF' : dispute.resultValue != null ? formatResultValue(dispute.resultValue, resultType) : '-'}
                {dispute.place != null ? ` · place ${dispute.place}` : ''}
              </Text>
            </View>
            <Text className="text-sm text-neutral-700">“{dispute.reason}”</Text>
            <Text className="text-xs text-neutral-400">Raised {formatRelativeTime(dispute.raisedAt)}</Text>

            {isEditing ? (
              <View className="gap-2 border-t border-neutral-100 pt-2">
                <Text className="text-xs font-medium text-neutral-700">
                  Corrected {config.label.toLowerCase()}{config.unit ? ` (${config.unit})` : ''}
                </Text>
                <View className="flex-row items-center gap-2">
                  <TextInput
                    className={`flex-1 border border-neutral-300 rounded-lg px-3 py-2 text-sm ${isDnf ? 'opacity-40' : ''}`}
                    editable={!isDnf}
                    keyboardType={config.inputMode === 'text' ? 'numbers-and-punctuation' : 'decimal-pad'}
                    placeholder={config.placeholder}
                    value={value}
                    onChangeText={setValue}
                  />
                  <Text className="text-xs text-neutral-600">DNF</Text>
                  <Switch value={isDnf} onValueChange={setIsDnf} trackColor={{ true: '#EF4444' }} />
                </View>
                <TextInput
                  className="border border-neutral-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="Optional note to the competitor"
                  value={note}
                  onChangeText={setNote}
                  maxLength={300}
                />
                <Text className="text-xs text-neutral-500">
                  Saving re-ranks everyone in this event from their results and recalculates points.
                </Text>
                <View className="flex-row justify-end gap-2">
                  <TouchableOpacity className="border border-neutral-200 rounded-lg px-3 py-2" onPress={() => setEditingId(null)}>
                    <Text className="text-xs font-semibold text-neutral-600">Back</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="bg-primary rounded-lg px-3 py-2" disabled={busy} onPress={() => void submit(dispute, 'resolve', true)}>
                    <Text className="text-xs font-semibold text-white">{busy ? 'Saving…' : 'Save correction'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View className="flex-row flex-wrap justify-end gap-2">
                <TouchableOpacity className="border border-neutral-200 rounded-lg px-3 py-2" disabled={busy} onPress={() => void submit(dispute, 'dismiss', false)}>
                  <Text className="text-xs font-semibold text-neutral-600">Dismiss</Text>
                </TouchableOpacity>
                <TouchableOpacity className="border border-primary rounded-lg px-3 py-2" disabled={busy} onPress={() => void submit(dispute, 'resolve', false)}>
                  <Text className="text-xs font-semibold text-primary">Resolve, no change</Text>
                </TouchableOpacity>
                <TouchableOpacity className="bg-primary rounded-lg px-3 py-2" disabled={busy} onPress={() => startEditing(dispute)}>
                  <Text className="text-xs font-semibold text-white">Correct result</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
