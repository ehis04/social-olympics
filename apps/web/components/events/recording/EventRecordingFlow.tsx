'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Square } from 'lucide-react';
import ROUTES from '@/constants/routes';
import { ParticipantSelector } from './ParticipantSelector';
import { ResultsRecorder } from './ResultsRecorder';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Participant {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

export type EntryState = { value: string; notes: string; isDnf: boolean };

interface EventRecordingFlowProps {
  event: Record<string, unknown>;
  competition: CompetitionRow;
  members: Participant[];
  defaultSelectedProfileIds?: string[];
  competitionId: string;
  eventId: string;
}

export function EventRecordingFlow({
  event,
  competition,
  members,
  defaultSelectedProfileIds,
  competitionId,
  eventId,
}: EventRecordingFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<'select' | 'record'>('select');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    defaultSelectedProfileIds ?? members.map((m) => m.profileId),
  );
  const [entries, setEntries] = useState<Record<string, EntryState>>({});
  const [isStopping, setIsStopping] = useState(false);

  const eventLibrary = event.events as Record<string, unknown> | null;
  const eventName =
    (event.name_override as string) ?? (eventLibrary?.name as string) ?? 'Event';
  const resultType = (eventLibrary?.result_type as string) ?? 'score';
  const scheduledAt = event.scheduled_at as string | null;
  const location = event.location as string | null;
  const category = (
    eventLibrary?.event_categories as Record<string, unknown> | null
  )?.name as string | null;

  const selectedParticipants = members.filter((m) =>
    selectedIds.includes(m.profileId),
  );

  function handleContinue() {
    // Preserve entries for already-entered participants, init new ones
    const updated = { ...entries };
    for (const id of selectedIds) {
      if (!updated[id]) {
        updated[id] = { value: '', notes: '', isDnf: false };
      }
    }
    setEntries(updated);
    setStep('record');
  }

  function handleComplete() {
    router.push(ROUTES.EVENT_DETAIL(competitionId, eventId));
    router.refresh();
  }

  async function handleStop() {
    if (!confirm('Stop this event? It will return to pending so you can restart it with different participants.')) return;
    setIsStopping(true);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/events/${eventId}/stop`,
        { method: 'POST' },
      );
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to stop event');
        return;
      }
      toast.success('Event stopped — it is now pending again');
      router.push(ROUTES.EVENT_DETAIL(competitionId, eventId));
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsStopping(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header nav */}
      <div className="flex items-center justify-between">
        <Link
          href={ROUTES.EVENT_DETAIL(competitionId, eventId)}
          className="flex items-center gap-1 text-sm text-grey-500 hover:text-grey-800"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to event
        </Link>
        <button
          type="button"
          onClick={handleStop}
          disabled={isStopping}
          className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
        >
          <Square className="h-3 w-3" />
          {isStopping ? 'Stopping…' : 'Stop Event'}
        </button>
      </div>

      {/* Event info card */}
      <div className="rounded-lg border border-grey-200 bg-white px-5 py-4">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-grey-900">{eventName}</h1>
              {category && (
                <span className="rounded-full bg-grey-100 px-2.5 py-0.5 text-xs font-medium text-grey-600 capitalize">
                  {category}
                </span>
              )}
            </div>
            {(scheduledAt || location) && (
              <p className="mt-0.5 text-sm text-grey-500">
                {scheduledAt &&
                  new Date(scheduledAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                {scheduledAt && location && ' · '}
                {location}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            step === 'select'
              ? 'bg-primary text-white'
              : 'bg-grey-100 text-grey-600'
          }`}
        >
          1. Participants
        </div>
        <div
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
            step === 'record'
              ? 'bg-primary text-white'
              : 'bg-grey-100 text-grey-600'
          }`}
        >
          2. Results
        </div>
      </div>

      {step === 'select' ? (
        <ParticipantSelector
          members={members}
          selected={selectedIds}
          onChange={setSelectedIds}
          onContinue={handleContinue}
        />
      ) : (
        <ResultsRecorder
          participants={selectedParticipants}
          entries={entries}
          onEntriesChange={setEntries}
          resultType={resultType}
          competitionId={competitionId}
          eventId={eventId}
          onBack={() => setStep('select')}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
