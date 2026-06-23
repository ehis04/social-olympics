'use client';

import { useState } from 'react';
import { CalendarClock, MapPin, Save, Trophy } from 'lucide-react';
import { toast } from '@/lib/toast';

interface MemberOption {
  profileId: string;
  displayName: string;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  resultType: string;
  status: string;
  scheduledAt: string | null;
  location: string | null;
  details: string | null;
  members: MemberOption[];
  submittedProfileIds: string[];
  onSaved: () => void;
  showResultEntry?: boolean;
}

function toDatetimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 16);
}

function getResultLabel(resultType: string): string {
  if (resultType === 'time') return 'Time (milliseconds)';
  if (resultType === 'distance') return 'Distance (centimetres)';
  if (resultType === 'weight') return 'Weight (kg)';
  if (resultType === 'inverted_score') return 'Score (lower is better)';
  return 'Result';
}

export function HostEventManagementPanel({
  competitionId,
  competitionEventId,
  resultType,
  status,
  scheduledAt,
  location,
  details,
  members,
  submittedProfileIds,
  onSaved,
  showResultEntry = true,
}: Props) {
  const [scheduledValue, setScheduledValue] = useState(toDatetimeLocal(scheduledAt));
  const [locationValue, setLocationValue] = useState(location ?? '');
  const [detailsValue, setDetailsValue] = useState(details ?? '');
  const [selectedProfileId, setSelectedProfileId] = useState(members[0]?.profileId ?? '');
  const [resultValue, setResultValue] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [isSavingResult, setIsSavingResult] = useState(false);

  const canEnterResults = status === 'active' || status === 'results_pending';
  const availableMembers = members.filter((member) => !submittedProfileIds.includes(member.profileId));

  async function saveDetails() {
    setIsSavingDetails(true);
    try {
      const response = await fetch(`/api/competitions/${competitionId}/events/${competitionEventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scheduled_at: scheduledValue ? new Date(scheduledValue).toISOString() : null,
          location: locationValue.trim() || null,
          details: detailsValue.trim() || null,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(json.error ?? 'Failed to update event details');
        return;
      }
      toast.success('Event details updated');
      onSaved();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSavingDetails(false);
    }
  }

  async function saveResult() {
    const parsed = resultType === 'weight' ? Number.parseFloat(resultValue) : Number.parseInt(resultValue, 10);
    if (!selectedProfileId || Number.isNaN(parsed) || parsed < 0) {
      toast.error('Choose a participant and enter a valid result');
      return;
    }

    setIsSavingResult(true);
    try {
      const response = await fetch(`/api/competitions/${competitionId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competition_event_id: competitionEventId,
          profile_id: selectedProfileId,
          result_value: parsed,
          ...(resultNotes.trim() ? { notes: resultNotes.trim() } : {}),
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        toast.error(json.error ?? 'Failed to save result');
        return;
      }
      toast.success('Result saved');
      setResultValue('');
      setResultNotes('');
      onSaved();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSavingResult(false);
    }
  }

  return (
    <section className="rounded-lg border border-grey-200 bg-white p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-grey-900">Event management</h2>
        <p className="mt-1 text-xs text-grey-500">
          Set event logistics and enter participant results from the host view.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm font-medium text-grey-700">
          <span className="mb-1 flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            Scheduled start
          </span>
          <input
            type="datetime-local"
            value={scheduledValue}
            onChange={(event) => setScheduledValue(event.target.value)}
            className="w-full rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>

        <label className="block text-sm font-medium text-grey-700">
          <span className="mb-1 flex items-center gap-1.5">
            <MapPin className="h-4 w-4" />
            Location
          </span>
          <input
            value={locationValue}
            onChange={(event) => setLocationValue(event.target.value)}
            placeholder="Court 2, park field, kitchen table..."
            className="w-full rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-4 block text-sm font-medium text-grey-700">
        Details
        <textarea
          value={detailsValue}
          onChange={(event) => setDetailsValue(event.target.value)}
          rows={3}
          placeholder="Rules, format, equipment, notes for participants..."
          className="mt-1 w-full rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </label>

      <button
        type="button"
        onClick={saveDetails}
        disabled={isSavingDetails}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        <Save className="h-4 w-4" />
        {isSavingDetails ? 'Saving...' : 'Save details'}
      </button>

      {showResultEntry && (
        <div className="mt-5 border-t border-grey-100 pt-5">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-grey-900">
            <Trophy className="h-4 w-4" />
            Enter participant result
          </h3>

          {!canEnterResults ? (
            <p className="rounded-md bg-grey-50 px-3 py-2 text-sm text-grey-500">
              Start the event before entering results.
            </p>
          ) : availableMembers.length === 0 ? (
            <p className="rounded-md bg-grey-50 px-3 py-2 text-sm text-grey-500">
              Results have been entered for every active participant.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr]">
              <select
                value={selectedProfileId}
                onChange={(event) => setSelectedProfileId(event.target.value)}
                className="rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                {availableMembers.map((member) => (
                  <option key={member.profileId} value={member.profileId}>
                    {member.displayName}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step={resultType === 'weight' ? '0.01' : '1'}
                value={resultValue}
                onChange={(event) => setResultValue(event.target.value)}
                placeholder={getResultLabel(resultType)}
                className="rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <input
                value={resultNotes}
                onChange={(event) => setResultNotes(event.target.value)}
                placeholder="Optional notes"
                className="rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none md:col-span-2"
              />
              <button
                type="button"
                onClick={saveResult}
                disabled={isSavingResult}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 md:col-span-2"
              >
                {isSavingResult ? 'Saving result...' : 'Save result'}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
