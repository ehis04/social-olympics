/*
 * This file defines the BlockedPeopleList user-interface component.
 */

// BlockedPeopleList — people the current user has blocked, with unblock buttons
'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ROUTES from '@/constants/routes';
import { toast } from '@/lib/toast';

interface BlockedPerson {
  blocked_id: string;
  profile: { id: string; display_name: string; avatar_url: string | null } | null;
}

// Renders the blocked people list component.
export function BlockedPeopleList() {
  const [people, setPeople] = useState<BlockedPerson[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const response = await fetch('/api/users/blocked');
      const json = (await response.json().catch(() => ({}))) as { data?: BlockedPerson[]; error?: string };
      if (!isMounted) return;
      if (!response.ok) setError(json.error ?? 'Blocked people could not be loaded.');
      else setPeople(json.data ?? []);
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  async function unblock(profileId: string) {
    setUnblockingId(profileId);
    const response = await fetch(`/api/users/${profileId}/block`, { method: 'DELETE' });
    setUnblockingId(null);
    if (!response.ok) {
      toast.error('Unblock failed. Please try again.');
      return;
    }
    setPeople((current) => (current ?? []).filter((person) => person.blocked_id !== profileId));
    toast.success('Unblocked');
  }

  return (
    <section className="rounded-lg border border-grey-200 bg-white p-6">
      <h2 className="text-base font-semibold text-grey-900">Blocked people</h2>
      <p className="mt-1 text-sm text-grey-500">
        You don&apos;t see their chat messages or comments, and neither of you can message the other.
      </p>
      {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      {!error && people === null && <p className="mt-4 text-sm text-grey-400">Loading…</p>}
      {people?.length === 0 && <p className="mt-4 text-sm text-grey-400">You haven&apos;t blocked anyone.</p>}
      {people && people.length > 0 && (
        <ul className="mt-4 divide-y divide-grey-100">
          {people.map((person) => (
            <li key={person.blocked_id} className="flex items-center justify-between gap-3 py-2.5">
              <Link href={ROUTES.PROFILE(person.blocked_id)} className="flex min-w-0 items-center gap-3 hover:underline">
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-grey-200 text-sm font-semibold text-grey-600">
                  {person.profile?.avatar_url ? (
                    <Image src={person.profile.avatar_url} alt="" fill sizes="32px" className="object-cover" />
                  ) : (
                    (person.profile?.display_name ?? '?').charAt(0).toUpperCase()
                  )}
                </span>
                <span className="truncate text-sm font-medium text-grey-900">{person.profile?.display_name ?? 'Unknown'}</span>
              </Link>
              <button
                type="button"
                onClick={() => void unblock(person.blocked_id)}
                disabled={unblockingId === person.blocked_id}
                className="rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50 disabled:opacity-60"
              >
                {unblockingId === person.blocked_id ? 'Saving…' : 'Unblock'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
