// ConfirmResultsPanel — host reviews, reorders, and confirms submitted results.
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { X, ChevronUp, ChevronDown } from 'lucide-react-native';
import { Image } from 'expo-image';
import { apiCall } from '@/lib/api/client';
import { toast } from '@/lib/toast';
import { triggerSuccess, triggerError } from '@/utils/helpers/haptics';
import { formatResultValue } from '@/utils/formatters/result';
import type { Database } from '@repo/types';

type ResultType = Database['public']['Enums']['result_type'];

interface ResultRow {
  id: string;
  profile_id: string | null;
  result_value_primary: number | null;
  confirmed_at: string | null;
  profiles: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

interface RankedResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  rawValue: number | null;
  place: number;
}

interface Props {
  competitionEventId: string;
  competitionId: string;
  results: ResultRow[];
  resultType: ResultType;
  onClose: () => void;
  onConfirmed: () => void;
}

function autoRank(results: ResultRow[], resultType: ResultType): RankedResult[] {
  const lowerIsBetter = resultType === 'time' || resultType === 'inverted_score';
  const pending = results.filter((r) => !r.confirmed_at);

  const sorted = [...pending].sort((a, b) => {
    const av = a.result_value_primary ?? 0;
    const bv = b.result_value_primary ?? 0;
    return lowerIsBetter ? av - bv : bv - av;
  });

  return sorted.map((r, idx) => ({
    id: r.id,
    displayName: r.profiles?.display_name ?? 'Unknown',
    avatarUrl: r.profiles?.avatar_url ?? null,
    rawValue: r.result_value_primary,
    place: idx + 1,
  }));
}

function getPlaceSuffix(place: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${place}${suffixes[place] ?? 'th'}`;
}

export function ConfirmResultsPanel({
  competitionEventId,
  competitionId,
  results,
  resultType,
  onClose,
  onConfirmed,
}: Props) {
  const [ranked, setRanked] = useState<RankedResult[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setRanked(autoRank(results, resultType));
  }, [results, resultType]);

  function move(idx: number, direction: 'up' | 'down') {
    const next = [...ranked];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
    setRanked(next.map((r, i) => ({ ...r, place: i + 1 })));
  }

  async function handleConfirm() {
    setIsConfirming(true);
    const { error } = await apiCall(
      `/api/competitions/${competitionId}/events/${competitionEventId}/confirm`,
      {
        method: 'POST',
        body: JSON.stringify({
          rankings: ranked.map((r) => ({ resultId: r.id, place: r.place })),
        }),
      }
    );
    setIsConfirming(false);

    if (error) {
      toast.error(error.message);
      triggerError();
      return;
    }

    triggerSuccess();
    toast.success('Results confirmed');
    onConfirmed();
  }

  return (
    <View className="bg-white rounded-lg border border-neutral-200 mx-4 mb-4">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-neutral-100">
        <Text className="text-sm font-semibold text-neutral-900">Confirm Results</Text>
        <TouchableOpacity onPress={onClose} className="p-1">
          <X size={18} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <View className="px-4 pt-3 pb-2">
        <Text className="text-xs text-neutral-500 mb-3">
          Results are auto-ranked by value. Use arrows to adjust order.
        </Text>

        {ranked.map((result, idx) => (
          <View
            key={result.id}
            className="flex-row items-center gap-3 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2.5 mb-2"
          >
            <Text className="w-8 text-xs font-bold text-neutral-600">
              {getPlaceSuffix(result.place)}
            </Text>

            <View className="w-7 h-7 rounded-full bg-neutral-200 overflow-hidden">
              {result.avatarUrl ? (
                <Image source={{ uri: result.avatarUrl }} style={{ width: 28, height: 28 }} />
              ) : (
                <View className="w-7 h-7 rounded-full bg-primary-muted items-center justify-center">
                  <Text className="text-xs font-bold text-primary">
                    {(result.displayName[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text className="flex-1 text-sm font-medium text-neutral-900" numberOfLines={1}>
              {result.displayName}
            </Text>

            {result.rawValue != null && (
              <Text className="text-xs text-neutral-500">
                {formatResultValue(result.rawValue, resultType as Database['public']['Enums']['result_type'])}
              </Text>
            )}

            <View className="flex-col gap-0.5">
              <TouchableOpacity
                onPress={() => move(idx, 'up')}
                disabled={idx === 0}
                className="px-1"
              >
                <ChevronUp size={16} color={idx === 0 ? '#E5E7EB' : '#6B7280'} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => move(idx, 'down')}
                disabled={idx === ranked.length - 1}
                className="px-1"
              >
                <ChevronDown size={16} color={idx === ranked.length - 1 ? '#E5E7EB' : '#6B7280'} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <View className="px-4 pb-4">
        <TouchableOpacity
          className="bg-primary rounded-lg py-3 items-center"
          onPress={handleConfirm}
          disabled={isConfirming || ranked.length === 0}
        >
          {isConfirming ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-sm">
              Confirm {ranked.length} Result{ranked.length !== 1 ? 's' : ''}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
