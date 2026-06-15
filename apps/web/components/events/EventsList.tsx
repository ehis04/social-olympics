'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { toast } from '@/lib/toast';

interface EventLibraryItem {
  name?: string | null;
  result_type?: string | null;
  event_categories?: { name?: string | null } | null;
}

interface CompetitionEvent {
  id?: string;
  sequence_order?: number | null;
  status?: string | null;
  weight_tag?: string | null;
  weight_multiplier?: number | null;
  events?: EventLibraryItem | null;
}

interface EventsListProps {
  events: Record<string, unknown>[];
  isHost: boolean;
  competitionStatus: string | null;
  competitionId: string;
  votingLocked: boolean | null;
}

export function EventsList({
  events,
  isHost,
  competitionStatus,
  competitionId,
  votingLocked,
}: EventsListProps) {
  const router = useRouter();
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const typedEvents = events as CompetitionEvent[];
  const canStartEvents = isHost && ['open', 'active'].includes(competitionStatus ?? '');

  async function startEvent(eventId: string) {
    setPendingEventId(eventId);

    try {
      const response = await fetch(`/api/competitions/${competitionId}/events/${eventId}/start`, {
        method: 'POST',
      });
      const json = await response.json();

      if (!response.ok) {
        toast.error(json.error ?? 'Failed to start event');
        return;
      }

      toast.success('Event started');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setPendingEventId(null);
    }
  }

  if (typedEvents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-grey-200 bg-grey-50 p-10 text-center">
        <p className="text-sm font-semibold text-grey-500">No events have been added yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-grey-800">Events</h1>
          <p className="mt-1 text-sm text-grey-500">
            {typedEvents.length} event{typedEvents.length !== 1 ? 's' : ''} in this competition
          </p>
        </div>
        {votingLocked && (
          <span className="rounded-full bg-grey-100 px-3 py-1 text-xs font-semibold text-grey-600">
            Voting locked
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-grey-200 bg-white">
        <ul className="divide-y divide-grey-100">
          {typedEvents.map((competitionEvent, index) => {
            const eventId = competitionEvent.id;
            const event = competitionEvent.events;
            const status = competitionEvent.status ?? 'pending';
            const isPending = status === 'pending';
            const canStart = !!eventId && canStartEvents && isPending;

            return (
              <li key={eventId ?? index} className="flex items-center gap-4 px-4 py-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-muted text-xs font-bold text-primary">
                  {competitionEvent.sequence_order ?? index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-semibold text-grey-800">
                      {event?.name ?? 'Untitled event'}
                    </h2>
                    <span className="rounded-full bg-grey-100 px-2 py-0.5 text-xs capitalize text-grey-600">
                      {status.replaceAll('_', ' ')}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-grey-500">
                    {event?.event_categories?.name ?? 'Uncategorised'}
                    {event?.result_type ? ` - ${event.result_type}` : ''}
                    {competitionEvent.weight_multiplier
                      ? ` - ${competitionEvent.weight_multiplier}x`
                      : ''}
                  </p>
                </div>

                {canStart && (
                  <button
                    type="button"
                    onClick={() => startEvent(eventId)}
                    disabled={pendingEventId === eventId}
                    className="inline-flex items-center gap-1.5 rounded bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                  >
                    <Play size={12} />
                    {pendingEventId === eventId ? 'Starting...' : 'Start'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
