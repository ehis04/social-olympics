'use client';

// DisputePanel — allows a competitor to raise a dispute against their confirmed result.
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from '@/lib/toast';

interface DisputePanelProps {
  resultId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function DisputePanel({ resultId, onClose, onSubmitted }: DisputePanelProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the dispute');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/results/${resultId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(json.error ?? 'Failed to raise dispute'); return; }
      toast.success('Dispute raised — host will be notified');
      onSubmitted();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-orange-900">Raise a Dispute</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-orange-100">
          <X className="h-4 w-4 text-orange-600" />
        </button>
      </div>
      <p className="text-xs text-orange-800">
        Disputes are reviewed by the host. Only raise a dispute if you believe your result
        was recorded incorrectly. The host&apos;s decision is final.
      </p>
      <div>
        <label className="block text-sm font-medium text-orange-900">Reason</label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Explain why you believe the result is incorrect…"
          className="mt-1 w-full rounded-md border border-orange-200 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !reason.trim()}
        className="w-full rounded-md bg-orange-600 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Dispute'}
      </button>
    </div>
  );
}
