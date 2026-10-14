/*
 * This file defines the CompetitionEventsManager user-interface component.
 */

'use client';

// CompetitionEventsManager — host tools to add, reorder, remove and cancel competition events
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Plus, Trash2, Ban } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import type { Database } from '@repo/types';

type CompetitionEventRow = Database['public']['Tables']['competition_events']['Row'] & {
  event: Database['public']['Tables']['events']['Row'] | null;
};

interface LibraryEvent {
  id: string;
  name: string;
  result_type: string;
  is_team_event: boolean;
  is_custom: boolean;
  event_categories?: { name: string; slug: string } | null;
}

interface Props {
  competitionId: string;
  events: CompetitionEventRow[];
  canEdit: boolean;
}

const WEIGHT_OPTIONS = [
  { label: 'Not important (0.5×)', tag: 'not_important' },
  { label: 'Standard (1×)', tag: 'standard' },
  { label: 'Important (1.5×)', tag: 'important' },
  { label: 'Very important (2×)', tag: 'very_important' },
] as const;

const RESULT_TYPE_OPTIONS = [
  { value: 'time', label: 'Time (lowest wins)' },
  { value: 'distance', label: 'Distance (furthest wins)' },
  { value: 'score', label: 'Score (highest wins)' },
  { value: 'inverted_score', label: 'Score (lowest wins)' },
  { value: 'weight', label: 'Weight lifted' },
  { value: 'compound', label: 'Reps' },
] as const;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Upcoming',
  active: 'Live',
  results_pending: 'Awaiting confirmation',
  disputed: 'Disputed',
  confirmed: 'Confirmed',
  cancelled: 'Cancelled',
};

// Renders the competition events manager component.
export function CompetitionEventsManager({ competitionId, events, canEdit }: Props) {
  const router = useRouter();
  // The server order is the source of truth; a reorder shows optimistically until the refresh arrives.
  // Keeping this component mounted means open panels and dialogs survive those refreshes.
  const propIds = events.map((event) => event.id);
  const [optimisticOrder, setOptimisticOrder] = useState<string[] | null>(null);
  const order = optimisticOrder &&
    optimisticOrder.length === propIds.length &&
    optimisticOrder.every((id) => propIds.includes(id))
    ? optimisticOrder
    : propIds;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [library, setLibrary] = useState<LibraryEvent[] | null>(null);
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [weightTag, setWeightTag] = useState<(typeof WEIGHT_OPTIONS)[number]['tag']>('standard');
  const [isAdding, setIsAdding] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customResultType, setCustomResultType] = useState<string>('score');
  const [customIsTeam, setCustomIsTeam] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<CompetitionEventRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<CompetitionEventRow | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const eventsById = useMemo(() => new Map(events.map((event) => [event.id, event])), [events]);
  const orderedEvents = order.map((id) => eventsById.get(id)).filter((event): event is CompetitionEventRow => !!event);
  const usedLibraryIds = new Set(events.map((event) => event.event_id));

  const filteredLibrary = (library ?? []).filter((event) =>
    !usedLibraryIds.has(event.id) &&
    (!search.trim() || event.name.toLowerCase().includes(search.trim().toLowerCase())),
  );

  async function openAdd() {
    setShowAdd(true);
    if (library) return;
    try {
      const res = await fetch('/api/events');
      const json = await readJson(res);
      if (!res.ok) throw new Error(getApiErrorMessage(json, 'Failed to load events'));
      setLibrary(((json as { data: LibraryEvent[] }).data ?? []));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load events');
      setLibrary([]);
    }
  }

  async function addEvent(eventId: string) {
    setIsAdding(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, weight_tag: weightTag }),
      });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to add event'));
        return false;
      }
      toast.success('Event added');
      setSelectedEventId('');
      setShowAdd(false);
      router.refresh();
      return true;
    } catch {
      toast.error('Something went wrong');
      return false;
    } finally {
      setIsAdding(false);
    }
  }

  async function createCustomEvent() {
    if (customName.trim().length < 2) {
      toast.error('Give the custom event a name');
      return;
    }
    setIsAdding(true);
    try {
      const res = await fetch('/api/events/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName.trim(),
          category_slug: 'other',
          result_type: customResultType,
          is_team_event: customIsTeam,
        }),
      });
      const json = await readJson(res);
      if (!res.ok) {
        toast.error(getApiErrorMessage(json, 'Failed to create custom event'));
        setIsAdding(false);
        return;
      }
      const created = (json as { data: LibraryEvent }).data;
      setLibrary((current) => (current ? [...current, created] : current));
      setCustomName('');
      setShowCustom(false);
      setIsAdding(false);
      await addEvent(created.id);
    } catch {
      toast.error('Something went wrong');
      setIsAdding(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setOptimisticOrder(next);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/events/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: next }),
      });
      if (!res.ok) {
        setOptimisticOrder(null);
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to reorder events'));
        return;
      }
      router.refresh();
    } catch {
      setOptimisticOrder(null);
      toast.error('Something went wrong');
    }
  }

  async function removeEvent(event: CompetitionEventRow) {
    setBusyId(event.id);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/events/${event.id}`, { method: 'DELETE' });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to remove event'));
        return;
      }
      toast.success('Event removed');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusyId(null);
      setConfirmRemove(null);
    }
  }

  async function cancelEvent() {
    if (!cancelTarget) return;
    setBusyId(cancelTarget.id);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/events/${cancelTarget.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason.trim() }),
      });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to cancel event'));
        return;
      }
      toast.success('Event cancelled');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusyId(null);
      setCancelTarget(null);
      setCancelReason('');
    }
  }

  return (
    <section className="rounded-lg border border-grey-200 bg-white p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-grey-800">Events</h2>
          <p className="text-xs text-grey-500">
            Add events, change the running order, or cancel events you no longer plan to run.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => void openAdd()}
            className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-muted"
          >
            <Plus size={14} />
            Add event
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-5 space-y-3 rounded-lg border border-grey-200 bg-grey-50 p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the event library"
              aria-label="Search the event library"
              className="flex-1 rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <select
              value={weightTag}
              onChange={(e) => setWeightTag(e.target.value as typeof weightTag)}
              aria-label="Event weight"
              className="rounded-lg border border-grey-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {WEIGHT_OPTIONS.map((option) => (
                <option key={option.tag} value={option.tag}>{option.label}</option>
              ))}
            </select>
          </div>

          {library === null ? (
            <p className="text-sm text-grey-500">Loading events…</p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-grey-200 bg-white">
              {filteredLibrary.length === 0 ? (
                <p className="p-3 text-sm text-grey-500">No matching events. Create a custom event below.</p>
              ) : (
                <ul className="divide-y divide-grey-100">
                  {filteredLibrary.map((event) => (
                    <li key={event.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-grey-50">
                        <input
                          type="radio"
                          name="library-event"
                          checked={selectedEventId === event.id}
                          onChange={() => setSelectedEventId(event.id)}
                        />
                        <span className="flex-1 truncate font-medium text-grey-800">{event.name}</span>
                        <span className="text-xs text-grey-400">
                          {event.is_custom ? 'Custom' : event.event_categories?.name ?? ''}
                          {event.is_team_event ? ' · Team' : ''}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowCustom((value) => !value)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              {showCustom ? 'Hide custom event' : 'Create a custom event'}
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-semibold text-grey-600 hover:bg-white"
              >
                Close
              </button>
              <button
                type="button"
                disabled={!selectedEventId || isAdding}
                onClick={() => void addEvent(selectedEventId)}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {isAdding ? 'Adding…' : 'Add selected event'}
              </button>
            </div>
          </div>

          {showCustom && (
            <div className="grid gap-3 rounded-lg border border-dashed border-grey-300 bg-white p-3 sm:grid-cols-2">
              <label className="text-sm font-medium text-grey-700 sm:col-span-2">
                Event name
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Egg and spoon race"
                  className="mt-1 w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="text-sm font-medium text-grey-700">
                How is it won?
                <select
                  value={customResultType}
                  onChange={(e) => setCustomResultType(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  {RESULT_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-grey-700">
                <input type="checkbox" checked={customIsTeam} onChange={(e) => setCustomIsTeam(e.target.checked)} />
                Team event
              </label>
              <button
                type="button"
                onClick={() => void createCustomEvent()}
                disabled={isAdding}
                className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50 sm:col-span-2"
              >
                {isAdding ? 'Creating…' : 'Create and add to competition'}
              </button>
            </div>
          )}
        </div>
      )}

      {orderedEvents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-grey-200 p-4 text-center text-sm text-grey-500">
          No events yet. Add one to get started.
        </p>
      ) : (
        <ol className="divide-y divide-grey-100 rounded-lg border border-grey-100">
          {orderedEvents.map((event, index) => {
            const status = event.status ?? 'pending';
            const canRemove = canEdit && status === 'pending';
            const canCancel = canEdit && ['pending', 'active', 'results_pending'].includes(status);
            return (
              <li key={event.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                <span className="w-6 text-center text-xs font-bold text-grey-400">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-grey-800">
                    {event.name_override ?? event.event?.name ?? 'Event'}
                  </p>
                  <p className="text-xs text-grey-500">
                    {STATUS_LABELS[status] ?? status}
                    {event.cancelled_reason ? ` · ${event.cancelled_reason}` : ''}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move earlier"
                      className="rounded p-1 text-grey-500 hover:bg-grey-100 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => void move(index, 1)}
                      disabled={index === orderedEvents.length - 1}
                      aria-label="Move later"
                      className="rounded p-1 text-grey-500 hover:bg-grey-100 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(event)}
                        disabled={busyId === event.id}
                        className="flex items-center gap-1 rounded border border-grey-200 px-2 py-1 text-xs font-semibold text-grey-600 hover:border-amber-300 hover:text-amber-700"
                      >
                        <Ban size={12} />
                        Cancel
                      </button>
                    )}
                    {canRemove && (
                      <button
                        type="button"
                        onClick={() => setConfirmRemove(event)}
                        disabled={busyId === event.id}
                        aria-label="Remove event"
                        className="rounded p-1 text-grey-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        isOpen={!!confirmRemove}
        title="Remove event?"
        message={`Remove ${confirmRemove?.event?.name ?? 'this event'} from the competition? This is only possible before it has any results.`}
        confirmLabel="Remove"
        isDanger
        onConfirm={() => confirmRemove && void removeEvent(confirmRemove)}
        onCancel={() => setConfirmRemove(null)}
      />

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setCancelTarget(null)} aria-hidden="true" />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg border border-grey-200 bg-white p-6 shadow-xl">
            <h2 className="mb-2 text-base font-bold text-grey-800">Cancel {cancelTarget.event?.name ?? 'event'}?</h2>
            <p className="mb-3 text-sm text-grey-600">
              Cancelled events do not count towards scores. Any unconfirmed submissions are discarded.
            </p>
            <label className="mb-4 block text-sm font-medium text-grey-700">
              Reason (optional)
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                maxLength={200}
                placeholder="e.g. Court unavailable"
                className="mt-1 w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50"
              >
                Keep event
              </button>
              <button
                type="button"
                onClick={() => void cancelEvent()}
                disabled={busyId === cancelTarget.id}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                Cancel event
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
