/*
 * This file defines the HostDisputePanel user-interface component.
 */

'use client';

// HostDisputePanel — host and co-host review open disputes: correct the result, resolve or dismiss.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import { formatResultForInput, formatResultValue, getResultInputConfig, parseResultInput } from '@repo/scoring';

export interface OpenDispute {
  disputeId: string;
  reason: string;
  raisedAt: string;
  displayName: string;
  resultValue: number | null;
  isDnf: boolean;
  place: number | null;
}

interface Props {
  competitionId: string;
  resultType: string;
  disputes: OpenDispute[];
}

// Renders the host dispute panel component.
export function HostDisputePanel({ competitionId, resultType, disputes }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [isDnf, setIsDnf] = useState(false);
  const [note, setNote] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const config = getResultInputConfig(resultType);

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
    try {
      const res = await fetch(`/api/disputes/${dispute.disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to update the dispute'));
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
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <h2 className="text-sm font-semibold text-orange-900">
          Open {disputes.length === 1 ? 'dispute' : 'disputes'} ({disputes.length})
        </h2>
      </div>

      {disputes.map((dispute) => {
        const isEditing = editingId === dispute.disputeId;
        const busy = busyId === dispute.disputeId;
        return (
          <div key={dispute.disputeId} className="rounded-lg border border-orange-200 bg-white p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-semibold text-grey-900">{dispute.displayName}</p>
              <p className="text-xs text-grey-500">
                Recorded: {dispute.isDnf ? 'DNF' : dispute.resultValue != null ? formatResultValue(dispute.resultValue, resultType) : '-'}
                {dispute.place != null ? ` · place ${dispute.place}` : ''}
              </p>
            </div>
            <p className="mt-1 text-sm text-grey-700">“{dispute.reason}”</p>
            <p className="mt-1 text-xs text-grey-400">Raised {new Date(dispute.raisedAt).toLocaleString()}</p>

            {isEditing ? (
              <div className="mt-3 space-y-3 border-t border-grey-100 pt-3">
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex-1 text-xs font-medium text-grey-700">
                    Corrected {config.label.toLowerCase()} {config.unit && `(${config.unit})`}
                    <input
                      type="text"
                      inputMode={config.inputMode}
                      value={value}
                      disabled={isDnf}
                      onChange={(e) => setValue(e.target.value)}
                      placeholder={config.placeholder}
                      className="mt-1 w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:bg-grey-100"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 pb-2 text-xs font-medium text-grey-700">
                    <input type="checkbox" checked={isDnf} onChange={(e) => setIsDnf(e.target.checked)} />
                    DNF
                  </label>
                </div>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  placeholder="Optional note to the competitor"
                  className="w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-grey-500">
                  Saving re-ranks everyone in this event from their results and recalculates points.
                </p>
                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-600 hover:bg-grey-50"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => void submit(dispute, 'resolve', true)}
                    disabled={busy}
                    className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                  >
                    {busy ? 'Saving…' : 'Save correction and resolve'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void submit(dispute, 'dismiss', false)}
                  disabled={busy}
                  className="rounded-lg border border-grey-200 px-3 py-1.5 text-xs font-semibold text-grey-600 hover:bg-grey-50 disabled:opacity-60"
                >
                  Dismiss dispute
                </button>
                <button
                  type="button"
                  onClick={() => void submit(dispute, 'resolve', false)}
                  disabled={busy}
                  className="rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-muted disabled:opacity-60"
                >
                  Resolve without changes
                </button>
                <button
                  type="button"
                  onClick={() => startEditing(dispute)}
                  disabled={busy}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
                >
                  Correct result
                </button>
              </div>
            )}
          </div>
        );
      })}
    </section>
  );
}
