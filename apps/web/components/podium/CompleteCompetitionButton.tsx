/*
 * This file defines the CompleteCompetitionButton user-interface component.
 */

// CompleteCompetitionButton — host-only button to mark competition complete
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import ROUTES from '@/constants/routes';

interface Props {
  competitionId: string;
}

// Renders the complete competition button component.
export function CompleteCompetitionButton({ competitionId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleComplete() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/complete`, { method: 'POST' });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), 'Failed to complete competition'));
        return;
      }
      toast.success('Competition completed: final ranks assigned');
      router.push(ROUTES.COMPETITION_PODIUM(competitionId));
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsPending(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
        <span className="text-xs text-red-700 font-medium">This cannot be undone. Finalise?</span>
        <button
          onClick={() => void handleComplete()}
          disabled={isPending}
          className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {isPending ? 'Completing…' : 'Yes, complete'}
        </button>
        <button
          onClick={() => setConfirming(false)}
          disabled={isPending}
          className="text-xs text-grey-500 hover:text-grey-700"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
    >
      Complete competition
    </button>
  );
}
