/*
 * This file defines the ResultsRecorder user-interface component.
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import { getResultInputConfig, isLowerBetter, parseResultInput } from '@repo/scoring';
import type { EntryState } from './EventRecordingFlow';

interface Participant {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ResultsRecorderProps {
  participants: Participant[];
  entries: Record<string, EntryState>;
  onEntriesChange: (entries: Record<string, EntryState>) => void;
  resultType: string;
  competitionId: string;
  eventId: string;
  onBack: () => void;
  onComplete: () => void;
}

const parseValueToStored = parseResultInput;
const lowerIsBetter = isLowerBetter;
const getInputConfig = getResultInputConfig;

// Handles compute ranks.
function computeRanks(
  entries: Record<string, EntryState>,
  participantIds: string[],
  resultType: string,
): Record<string, number | null> {
  const lower = lowerIsBetter(resultType);
  const withValues = participantIds
    .filter((id) => !entries[id]?.isDnf && entries[id]?.value.trim())
    .map((id) => ({ id, val: parseValueToStored(resultType, entries[id]?.value ?? '') }))
    .filter((x): x is { id: string; val: number } => x.val !== null)
    .sort((a, b) => (lower ? a.val - b.val : b.val - a.val));

  const ranks: Record<string, number | null> = {};
  participantIds.forEach((id) => { ranks[id] = null; });

  let rank = 1;
  for (let i = 0; i < withValues.length; i++) {
    if (i > 0 && withValues[i]!.val !== withValues[i - 1]!.val) rank = i + 1;
    ranks[withValues[i]!.id] = rank;
  }

  return ranks;
}

// Handles get rank badge class.
function getRankBadgeClass(rank: number | null, isDnf: boolean): string {
  if (isDnf) return 'bg-grey-100 text-grey-400';
  if (rank === 1) return 'bg-yellow-100 text-yellow-700';
  if (rank === 2) return 'bg-grey-100 text-grey-600';
  if (rank === 3) return 'bg-orange-100 text-orange-700';
  if (rank !== null) return 'bg-grey-100 text-grey-600';
  return 'bg-grey-100 text-grey-400';
}

// Handles get rank label.
function getRankLabel(rank: number | null, isDnf: boolean): string {
  if (isDnf) return 'DNF';
  if (rank !== null) return String(rank);
  return '-';
}

// Renders the results recorder component.
export function ResultsRecorder({
  participants,
  entries,
  onEntriesChange,
  resultType,
  competitionId,
  eventId,
  onBack,
  onComplete,
}: ResultsRecorderProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const inputConfig = getInputConfig(resultType);
  const participantIds = participants.map((p) => p.profileId);
  const ranks = computeRanks(entries, participantIds, resultType);

  const sortedParticipants = [...participants].sort((a, b) => {
    const aEntry = entries[a.profileId];
    const bEntry = entries[b.profileId];
    const aIsDnf = aEntry?.isDnf ?? false;
    const bIsDnf = bEntry?.isDnf ?? false;
    const aRank = ranks[a.profileId];
    const bRank = ranks[b.profileId];

    if (aIsDnf && !bIsDnf) return 1;
    if (!aIsDnf && bIsDnf) return -1;
    const aR = aRank ?? null;
    const bR = bRank ?? null;
    if (aR !== null && bR !== null) return aR - bR;
    if (aR !== null) return -1;
    if (bR !== null) return 1;
    return 0;
  });

  function updateEntry(profileId: string, patch: Partial<EntryState>) {
    onEntriesChange({
      ...entries,
      [profileId]: { ...(entries[profileId] ?? { value: '', notes: '', isDnf: false }), ...patch },
    });
  }

  const validCount = participants.filter(
    (p) => entries[p.profileId]?.isDnf || parseValueToStored(resultType, entries[p.profileId]?.value ?? '') !== null,
  ).length;

  const hasAnyValue = participants.some(
    (p) => entries[p.profileId]?.isDnf || (entries[p.profileId]?.value.trim() && parseValueToStored(resultType, entries[p.profileId]?.value ?? '') !== null),
  );

  const missingCount = participants.length - validCount;

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const payload = participants.map((p) => {
        const e = entries[p.profileId];
        const stored = e?.isDnf ? null : parseValueToStored(resultType, e?.value ?? '');
        return {
          profileId: p.profileId,
          value: stored,
          notes: e?.notes?.trim() || null,
          isDnf: e?.isDnf ?? false,
        };
      });

      const res = await fetch(
        `/api/competitions/${competitionId}/events/${eventId}/record`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ results: payload }),
        },
      );

      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to record results'));
        return;
      }

      toast.success('Results recorded and confirmed');
      onComplete();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-grey-900">Enter Results</h2>
          <span className="rounded-full bg-grey-100 px-2.5 py-0.5 text-xs font-medium text-grey-600 capitalize">
            {resultType.replace('_', ' ')}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-grey-200 bg-white overflow-hidden">
        <ul className="divide-y divide-grey-100">
          {sortedParticipants.map((participant) => {
            const entry = entries[participant.profileId] ?? { value: '', notes: '', isDnf: false };
            const rank = ranks[participant.profileId] ?? null;

            return (
              <li key={participant.profileId} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${getRankBadgeClass(rank, entry.isDnf)}`}
                  >
                    {getRankLabel(rank, entry.isDnf)}
                  </div>

                  <div className="shrink-0">
                    {participant.avatarUrl ? (
                      <Image
                        src={participant.avatarUrl}
                        alt={participant.displayName}
                        width={28}
                        height={28}
                        className="h-7 w-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-grey-200 text-xs font-bold text-grey-500">
                        {participant.displayName[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <p className="w-24 shrink-0 truncate text-sm font-medium text-grey-900 sm:w-32">
                    {participant.displayName}
                  </p>

                  <div className="flex flex-1 items-center gap-2 min-w-0">
                    <div className="relative flex-1 min-w-0">
                      <input
                        type="text"
                        inputMode={inputConfig.inputMode}
                        aria-label={`${inputConfig.label} for ${participant.displayName}`}
                        value={entry.value}
                        onChange={(e) =>
                          updateEntry(participant.profileId, { value: e.target.value })
                        }
                        placeholder={inputConfig.placeholder}
                        disabled={entry.isDnf}
                        className="w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-grey-100 disabled:text-grey-400"
                      />
                    </div>
                    {inputConfig.unit && (
                      <span className="shrink-0 text-xs text-grey-500">{inputConfig.unit}</span>
                    )}
                    <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-grey-500">
                      <input
                        type="checkbox"
                        checked={entry.isDnf}
                        onChange={(e) =>
                          updateEntry(participant.profileId, {
                            isDnf: e.target.checked,
                            ...(e.target.checked ? { value: '' } : {}),
                          })
                        }
                        className="h-3.5 w-3.5 rounded border-grey-300 accent-primary"
                      />
                      DNF
                    </label>
                  </div>

                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) =>
                      updateEntry(participant.profileId, { notes: e.target.value })
                    }
                    placeholder="Notes"
                    className="hidden w-28 rounded-lg border border-grey-300 px-3 py-2 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:block"
                  />
                </div>
                <div className="mt-2 pl-[calc(28px+28px+96px+12px+12px)] sm:hidden">
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) =>
                      updateEntry(participant.profileId, { notes: e.target.value })
                    }
                    placeholder="Notes (optional)"
                    className="w-full rounded-lg border border-grey-300 px-3 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {missingCount > 0 && hasAnyValue && (
        <p className="text-sm text-grey-500">
          {missingCount} participant{missingCount !== 1 ? 's have' : ' has'} no value entered: they will be excluded from results.
        </p>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-grey-500 hover:text-grey-800"
        >
          ← Add / remove participants
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || !hasAnyValue}
          className="rounded-md bg-primary py-2.5 px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
        >
          {isSubmitting
            ? 'Saving…'
            : `Confirm Results (${validCount} participant${validCount !== 1 ? 's' : ''})`}
        </button>
      </div>
    </div>
  );
}
