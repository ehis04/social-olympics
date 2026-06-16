// ArchiveCompetitionButton — host-only button to archive a complete competition
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import ROUTES from '@/constants/routes';

interface Props {
  competitionId: string;
}

export function ArchiveCompetitionButton({ competitionId }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/archive`, { method: 'POST' });
      if (!res.ok) {
        const json = await res.json() as { error?: string };
        toast.error(json.error ?? 'Failed to archive competition');
        return;
      }
      toast.success('Competition archived');
      router.push(ROUTES.DASHBOARD);
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
      <div className="flex items-center gap-2 rounded-lg border border-grey-200 bg-grey-50 px-3 py-2">
        <span className="text-xs text-grey-700 font-medium">Archive this competition?</span>
        <button
          onClick={() => void handleArchive()}
          disabled={isPending}
          className="rounded-md bg-grey-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-grey-800 disabled:opacity-50"
        >
          {isPending ? 'Archiving…' : 'Yes, archive'}
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
      className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-medium text-grey-600 hover:bg-grey-50"
    >
      Archive competition
    </button>
  );
}
