/*
 * This file defines the NewSeasonButton user-interface component.
 */

// NewSeasonButton — host-only button that starts the next season of a finished competition
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import ROUTES from '@/constants/routes';

interface Props {
  competitionId: string;
  // The season already started from this competition, if any.
  nextSeason: { id: string; season_number: number } | null;
}

// Renders the new season button component.
export function NewSeasonButton({ competitionId, nextSeason }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  if (nextSeason) {
    return (
      <Link
        href={ROUTES.COMPETITION_SETTINGS(nextSeason.id)}
        className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        Go to season {nextSeason.season_number}
      </Link>
    );
  }

  async function handleStart() {
    setIsPending(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/new-season`, { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as { data?: { id: string }; error?: string };
      if (!res.ok || !json.data) {
        toast.error(json.error ?? 'The new season could not be started');
        if (json.data?.id) router.push(ROUTES.COMPETITION_SETTINGS(json.data.id));
        return;
      }
      toast.success('New season created. Review the events and members, then share the invite.');
      router.push(ROUTES.COMPETITION_SETTINGS(json.data.id));
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleStart()}
      disabled={isPending}
      className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
    >
      {isPending ? 'Starting…' : 'Start new season'}
    </button>
  );
}
