'use client';

// Modal form for creating a ghost (guest) profile within a competition
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from '@/lib/toast';

interface Props {
  competitionId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function GhostProfileForm({ competitionId, onClose, onSuccess }: Props) {
  const [displayName, setDisplayName] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    if (!displayName.trim() || displayName.trim().length < 2) {
      setError('Display name must be at least 2 characters');
      return;
    }
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/competitions/${competitionId}/ghost-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          country_code: countryCode || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to create guest profile');
        return;
      }
      toast.success(`Guest profile "${displayName.trim()}" created`);
      onSuccess();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg border border-grey-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-grey-800">Create guest profile</h2>
          <button onClick={onClose} className="text-grey-400 hover:text-grey-600">
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-grey-500">
          Guest profiles appear on the leaderboard like real accounts. The guest can claim their
          profile later via an invite link.
        </p>

        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-grey-700">
            Display name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => { setDisplayName(e.target.value); setError(''); }}
            placeholder="e.g. Alex Smith"
            maxLength={40}
            className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>

        <div className="mb-6">
          <label className="mb-1 block text-sm font-semibold text-grey-700">
            Country <span className="text-grey-400 font-normal">(optional)</span>
          </label>
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full rounded-lg border border-grey-200 px-3 py-2.5 text-sm text-grey-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Select country</option>
            <option value="IE">Ireland</option>
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="DE">Germany</option>
            <option value="FR">France</option>
            <option value="ES">Spain</option>
            <option value="IT">Italy</option>
            <option value="AU">Australia</option>
            <option value="CA">Canada</option>
          </select>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
          >
            {isSubmitting ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
