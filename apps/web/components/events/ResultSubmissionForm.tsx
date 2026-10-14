/*
 * This file defines the ResultSubmissionForm user-interface component.
 */

'use client';

// ResultSubmissionForm — form for competitors to submit their result for an active event.
import { useEffect, useRef, useState } from 'react';
import { Camera, Pause, Play, RotateCcw, X } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import { prepareEvidencePhoto } from '@/lib/images/prepare-image';
import { formatResultForInput, getResultInputConfig, parseResultInput } from '@repo/scoring';

interface ResultSubmissionFormProps {
  competitionEventId: string;
  competitionId: string;
  resultType: string;
  onClose: () => void;
  onSubmitted: () => void;
}

// Handles is valid url.
function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Renders the stopwatch component used for timed events.
function Stopwatch({ onUse }: { onUse: (milliseconds: number) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed(base.current + (performance.now() - startedAt.current));
    }, 31);
    return () => window.clearInterval(timer);
  }, [running]);

  function start() {
    startedAt.current = performance.now();
    setRunning(true);
  }

  function stop() {
    if (startedAt.current !== null) {
      base.current += performance.now() - startedAt.current;
      startedAt.current = null;
    }
    setElapsed(base.current);
    setRunning(false);
    onUse(Math.round(base.current));
  }

  function reset() {
    base.current = 0;
    startedAt.current = null;
    setElapsed(0);
    setRunning(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-grey-200 bg-grey-50 px-3 py-2">
      <span className="font-mono text-lg font-semibold tabular-nums text-grey-900" aria-live="off">
        {formatResultForInput('time', elapsed)}s
      </span>
      <div className="ml-auto flex gap-2">
        {running ? (
          <button
            type="button"
            onClick={stop}
            className="flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
          >
            <Pause className="h-3.5 w-3.5" />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-dark"
          >
            <Play className="h-3.5 w-3.5" />
            {elapsed > 0 ? 'Resume' : 'Start timer'}
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          disabled={running || elapsed === 0}
          aria-label="Reset timer"
          className="rounded-md border border-grey-200 bg-white p-1.5 text-grey-500 hover:text-grey-800 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// Renders the result submission form component.
export function ResultSubmissionForm({
  competitionEventId,
  competitionId,
  resultType,
  onClose,
  onSubmitted,
}: ResultSubmissionFormProps) {
  const [value, setValue] = useState('');
  const [notes, setNotes] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const config = getResultInputConfig(resultType);
  const parsedValue = parseResultInput(resultType, value);
  const showValueError = value.trim().length > 0 && parsedValue === null;

  async function handlePhoto(file: File | undefined) {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const prepared = await prepareEvidencePhoto(file);
      const formData = new FormData();
      formData.append('photo', prepared);
      const res = await fetch('/api/results/evidence', { method: 'POST', body: formData });
      const json = (await readJson(res)) as { data?: { url: string } } | null;
      if (!res.ok || !json?.data?.url) {
        toast.error(getApiErrorMessage(json, 'The photo could not be uploaded'));
        return;
      }
      setPhotoUrl(json.data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The photo could not be uploaded');
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  }

  async function handleSubmit() {
    if (parsedValue === null) {
      toast.error(`Enter a valid ${config.label.toLowerCase()}`);
      return;
    }
    const trimmedEvidence = photoUrl ?? evidenceUrl.trim();
    if (trimmedEvidence && !isValidUrl(trimmedEvidence)) {
      toast.error('Evidence must be a full link starting with https://');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          competition_event_id: competitionEventId,
          result_value: parsedValue,
          ...(notes.trim() && { notes: notes.trim() }),
          ...(trimmedEvidence && { evidence_url: trimmedEvidence }),
        }),
      });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to submit result'));
        return;
      }
      toast.success('Result submitted: the host will confirm it');
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
        <button onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-grey-100">
          <X className="h-4 w-4 text-grey-500" />
        </button>
      </div>

      {resultType === 'time' && (
        <Stopwatch onUse={(milliseconds) => setValue(formatResultForInput('time', milliseconds))} />
      )}

      <div>
        <label htmlFor="result-value" className="block text-sm font-medium text-grey-700">
          {config.label}
          {config.unit && <span className="ml-1 text-grey-400">({config.unit})</span>}
        </label>
        <input
          id="result-value"
          type="text"
          inputMode={config.inputMode}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={config.placeholder}
          aria-invalid={showValueError}
          className="mt-1 w-full rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {showValueError ? (
          <p className="mt-1 text-xs text-red-600">That does not look like a valid {config.label.toLowerCase()}.</p>
        ) : (
          config.help && <p className="mt-1 text-xs text-grey-500">{config.help}</p>
        )}
      </div>

      <div>
        <p className="block text-sm font-medium text-grey-700">
          Evidence <span className="text-grey-400">(optional)</span>
        </p>
        {photoUrl ? (
          <div className="mt-1 flex items-center gap-3 rounded-lg border border-grey-200 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- small preview of the just-uploaded photo */}
            <img src={photoUrl} alt="Evidence photo" className="h-14 w-14 rounded object-cover" />
            <span className="flex-1 text-sm text-grey-700">Photo attached</span>
            <button
              type="button"
              onClick={() => setPhotoUrl(null)}
              className="rounded-md border border-grey-200 px-2.5 py-1 text-xs font-medium text-grey-600 hover:bg-grey-50"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-grey-300 px-3 py-2 text-sm font-medium text-grey-700 hover:bg-grey-50 disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {isUploadingPhoto ? 'Uploading…' : 'Add photo'}
            </button>
            <input
              id="result-evidence"
              type="url"
              aria-label="Evidence link"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="or paste a link (https://…)"
              className="min-w-0 flex-1 rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        )}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          aria-label="Evidence photo"
          onChange={(e) => void handlePhoto(e.target.files?.[0])}
        />
      </div>

      <div>
        <label htmlFor="result-notes" className="block text-sm font-medium text-grey-700">
          Notes <span className="text-grey-400">(optional)</span>
        </label>
        <textarea
          id="result-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          maxLength={300}
          placeholder="Any context for the host…"
          className="mt-1 w-full resize-none rounded-lg border border-grey-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={isSubmitting || isUploadingPhoto || parsedValue === null}
        className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
      >
        {isSubmitting ? 'Submitting…' : 'Submit result'}
      </button>
    </div>
  );
}
