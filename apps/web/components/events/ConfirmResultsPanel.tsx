'use client';

// ConfirmResultsPanel — host reviews submitted results, assigns places, and confirms.
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, GripVertical } from 'lucide-react';
import { toast } from '@/lib/toast';
import { formatResultValue } from '@/utils/formatters/result';
import { getPlaceSuffix } from '@/utils/helpers/results';

interface ConfirmResultsPanelProps {
  competitionEventId: string;
  competitionId: string;
  results: Record<string, unknown>[];
  resultType: string;
  onClose: () => void;
  onConfirmed: () => void;
}

interface RankedResult {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  rawValue: number | null;
  place: number;
}

function autoRank(results: Record<string, unknown>[], resultType: string): RankedResult[] {
  const lowerIsBetter = resultType === 'time' || resultType === 'inverted_score';
  const pending = results.filter((r) => !r.confirmed_at);

  const sorted = [...pending].sort((a, b) => {
    const av = (a.result_value as number | null) ?? 0;
    const bv = (b.result_value as number | null) ?? 0;
    return lowerIsBetter ? av - bv : bv - av;
  });

  return sorted.map((r, idx) => {
    const profile = r.profiles as Record<string, unknown> | null;
    return {
      id: r.id as string,
      displayName: (profile?.display_name as string) ?? 'Unknown',
      avatarUrl: (profile?.avatar_url as string | null) ?? null,
      rawValue: (r.result_value as number | null) ?? null,
      place: idx + 1,
    };
  });
}

export function ConfirmResultsPanel({
  competitionEventId,
  competitionId,
  results,
  resultType,
  onClose,
  onConfirmed,
}: ConfirmResultsPanelProps) {
  const [ranked, setRanked] = useState<RankedResult[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  useEffect(() => {
    setRanked(autoRank(results, resultType));
  }, [results, resultType]);

  function moveUp(idx: number) {
    if (idx === 0) return;
    const next = [...ranked];
    [next[idx - 1], next[idx]] = [next[idx]!, next[idx - 1]!];
    setRanked(next.map((r, i) => ({ ...r, place: i + 1 })));
  }

  function moveDown(idx: number) {
    if (idx === ranked.length - 1) return;
    const next = [...ranked];
    [next[idx], next[idx + 1]] = [next[idx + 1]!, next[idx]!];
    setRanked(next.map((r, i) => ({ ...r, place: i + 1 })));
  }

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/events/${competitionEventId}/confirm`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rankings: ranked.map((r) => ({ resultId: r.id, place: r.place })) }),
        },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(json.error ?? 'Failed to confirm results'); return; }
      toast.success('Results confirmed');
      onConfirmed();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsConfirming(false);
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-grey-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-grey-900">Confirm Results</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-grey-100">
          <X className="h-4 w-4 text-grey-500" />
        </button>
      </div>

      <div className="px-5 py-3">
        <p className="text-xs text-grey-500 mb-3">
          Results are auto-ranked by value. Drag or use arrows to adjust order before confirming.
        </p>

        <ul className="space-y-2">
          {ranked.map((result, idx) => (
            <li
              key={result.id}
              className="flex items-center gap-3 rounded-md border border-grey-100 bg-grey-50 px-3 py-2"
            >
              <GripVertical className="h-4 w-4 text-grey-300 shrink-0" />
              <span className="w-8 text-xs font-bold text-grey-600">{getPlaceSuffix(result.place)}</span>
              {result.avatarUrl ? (
                <Image
                  src={result.avatarUrl}
                  alt={result.displayName}
                  width={24}
                  height={24}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-grey-200 text-xs font-bold text-grey-500">
                  {result.displayName[0]?.toUpperCase()}
                </div>
              )}
              <span className="flex-1 truncate text-sm font-medium text-grey-900">{result.displayName}</span>
              {result.rawValue != null && (
                <span className="text-xs text-grey-500">{formatResultValue(result.rawValue, resultType)}</span>
              )}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="rounded px-1 text-xs text-grey-400 hover:text-grey-600 disabled:opacity-20"
                >▲</button>
                <button
                  onClick={() => moveDown(idx)}
                  disabled={idx === ranked.length - 1}
                  className="rounded px-1 text-xs text-grey-400 hover:text-grey-600 disabled:opacity-20"
                >▼</button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-grey-100 px-5 py-3">
        <button
          onClick={handleConfirm}
          disabled={isConfirming || ranked.length === 0}
          className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {isConfirming ? 'Confirming…' : `Confirm ${ranked.length} Result${ranked.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </div>
  );
}
