'use client';

// ResultSubmissionForm — form for competitors to submit their result for an active event.
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from '@/lib/toast';

interface ResultSubmissionFormProps {
  competitionEventId: string;
  competitionId: string;
  resultType: string;
  onClose: () => void;
  onSubmitted: () => void;
}

function getResultLabel(resultType: string): string {
  switch (resultType) {
    case 'time': return 'Time (milliseconds)';
    case 'distance': return 'Distance (centimetres)';
    case 'score': return 'Score';
    case 'inverted_score': return 'Score (lower is better)';
    case 'weight': return 'Weight lifted (kg)';
    case 'compound': return 'Reps completed';
    case 'possession': return 'Points scored';
    default: return 'Result';
  }
}

function getResultPlaceholder(resultType: string): string {
  switch (resultType) {
    case 'time': return 'e.g. 10230 (10.23 seconds)';
    case 'distance': return 'e.g. 750 (7.50 metres)';
    case 'score': return 'e.g. 42';
    case 'inverted_score': return 'e.g. 5 (strokes / errors)';
    case 'weight': return 'e.g. 85.5';
    case 'compound': return 'e.g. 12';
    case 'possession': return 'e.g. 3';
    default: return '';
  }
}

function getResultHelp(resultType: string): string {
  switch (resultType) {
    case 'time': return 'Enter total milliseconds. 1 second = 1000ms. 1 minute = 60000ms.';
    case 'distance': return 'Enter centimetres. 1 metre = 100cm.';
    case 'weight': return 'Enter kilograms with up to 2 decimal places.';
    default: return '';
  }
}

export function ResultSubmissionForm({
  competitionEventId,
  competitionId,
  resultType,
  onClose,
  onSubmitted,
}: ResultSubmissionFormProps) {
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const help = getResultHelp(resultType);
  const isDecimal = resultType === 'weight';

  async function handleSubmit() {
    const parsed = isDecimal ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(parsed) || parsed < 0) {
      toast.error('Please enter a valid positive number');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competition_event_id: competitionEventId,
          result_value: parsed,
          ...(notes.trim() && { notes: notes.trim() }),
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(json.error ?? 'Failed to submit result'); return; }
      toast.success('Result submitted');
      onSubmitted();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-grey-900">Submit your result</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-grey-100">
          <X className="h-4 w-4 text-grey-500" />
        </button>
      </div>

      <div>
        <label className="block text-sm font-medium text-grey-700">
          {getResultLabel(resultType)}
        </label>
        <input
          type="number"
          min="0"
          step={isDecimal ? '0.01' : '1'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={getResultPlaceholder(resultType)}
          className="mt-1 w-full rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        {help && <p className="mt-1 text-xs text-grey-500">{help}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-grey-700">
          Notes <span className="text-grey-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Any context for the host…"
          className="mt-1 w-full rounded-md border border-grey-200 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !value}
        className="w-full rounded-md bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {isSubmitting ? 'Submitting…' : 'Submit Result'}
      </button>
    </div>
  );
}
