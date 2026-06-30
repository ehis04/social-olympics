'use client';

// ReportButton — triggers a report modal for any content type
import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { toast } from '@/lib/toast';

type ReportTargetType = 'competition' | 'profile' | 'feed_item' | 'message';

interface Props {
  targetType: ReportTargetType;
  targetId: string;
  competitionId?: string;
  label?: string;
}

const REASON_OPTIONS = [
  'Offensive or abusive content',
  'Harassment or bullying',
  'Spam or fake account',
  'Cheating or result manipulation',
  'Inappropriate name or description',
  'Other',
];

export function ReportButton({ targetType, targetId, competitionId, label }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleOpen() {
    setShowModal(true);
    setReason('');
    setCustomReason('');
  }

  function handleClose() {
    setShowModal(false);
  }

  async function handleSubmit() {
    const finalReason = reason === 'Other' ? customReason.trim() : reason;
    if (!finalReason) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_type: targetType,
          target_id: targetId,
          competition_id: competitionId,
          reason: finalReason,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to submit report');
        return;
      }
      toast.success('Report submitted: our team will review it');
      handleClose();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  const finalReason = reason === 'Other' ? customReason.trim() : reason;
  const canSubmit = !!finalReason && !isSubmitting;

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-grey-400 hover:bg-grey-100 hover:text-grey-600 transition-colors"
      >
        <Flag size={12} />
        {label ?? 'Report'}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleClose} aria-hidden="true" />
          <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg border border-grey-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-grey-800">Report content</h2>
              <button onClick={handleClose} className="text-grey-400 hover:text-grey-600">
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-xs text-grey-500">
              Select the reason that best describes the issue. Reports are reviewed by our moderation team.
            </p>

            <div className="mb-4 space-y-2">
              {REASON_OPTIONS.map((option) => (
                <label key={option} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="report-reason"
                    value={option}
                    checked={reason === option}
                    onChange={() => setReason(option)}
                    className="accent-primary"
                  />
                  <span className="text-sm text-grey-700">{option}</span>
                </label>
              ))}
            </div>

            {reason === 'Other' && (
              <div className="mb-4">
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please describe the issue…"
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-lg border border-grey-200 px-3 py-2 text-sm text-grey-800 placeholder:text-grey-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <p className="mt-1 text-right text-xs text-grey-400">{customReason.length}/500</p>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => void handleSubmit()}
                disabled={!canSubmit}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
              >
                {isSubmitting ? 'Submitting…' : 'Submit report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
