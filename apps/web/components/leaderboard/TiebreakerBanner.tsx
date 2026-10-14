/*
 * This file defines the TiebreakerBanner user-interface component.
 */

// TiebreakerBanner — shows a podium tie and walks the players and host through the tiebreaker
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import type { RankedMember } from '@/hooks/leaderboard/useLeaderboard';
import type { TiebreakerInfo } from './LeaderboardView';

interface Props {
  tiedEntries: RankedMember[];
  currentUserId: string;
  isHost: boolean;
  competitionId: string;
  tiebreaker: TiebreakerInfo | null;
  eventsRemaining: number;
}

const RESOLVED_BY_LABELS: Record<string, string> = {
  medal_count: 'on medals',
  event_nomination: 'on the nominated events',
  raw_margin: 'on the nominated events',
  host: 'by the host',
};

// Renders the tiebreaker banner component.
export function TiebreakerBanner({ tiedEntries, currentUserId, isHost, competitionId, tiebreaker, eventsRemaining }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [eventId, setEventId] = useState('');

  const isInvolved = tiedEntries.some((entry) => entry.profile_id === currentUserId);
  if (!isInvolved && !isHost) return null;

  const nameOf = (profileId: string | null) =>
    tiedEntries.find((entry) => entry.profile_id === profileId)?.profiles?.display_name ?? 'Unknown';
  const names = tiedEntries.map((entry) => entry.profiles?.display_name ?? 'Unknown').join(' and ');
  const place = tiedEntries[0]?.rank ?? 0;
  const isPair = tiedEntries.length === 2;

  async function post(url: string, body: unknown, success: string, fallback: string) {
    setBusy(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error(getApiErrorMessage(await readJson(res), fallback));
        return;
      }
      toast.success(success);
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const base = `/api/competitions/${competitionId}/tiebreakers`;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm font-medium text-amber-900">
        {names} are level for place {place} on points and medals.
      </p>

      {!isPair && (
        <p className="text-xs text-amber-800">
          Three or more competitors share this place. They will share it in the final standings.
        </p>
      )}

      {isPair && !tiebreaker && (
        isHost ? (
          eventsRemaining > 0 ? (
            <p className="text-xs text-amber-800">
              {eventsRemaining} event{eventsRemaining === 1 ? '' : 's'} still to finish. Start a tiebreaker once the
              results are final, or leave it and they will share the place.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-amber-800">
                Start a tiebreaker to separate them, or complete the competition and they will share the place.
              </p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void post(base, {
                  profile_id_a: tiedEntries[0]!.profile_id,
                  profile_id_b: tiedEntries[1]!.profile_id,
                }, 'Tiebreaker started', 'Failed to start tiebreaker')}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {busy ? 'Starting…' : 'Start tiebreaker'}
              </button>
            </div>
          )
        ) : (
          <p className="text-xs text-amber-800">If the host starts a tiebreaker, you will be asked to nominate an event.</p>
        )
      )}

      {tiebreaker && (tiebreaker.status === 'pending_nomination' || tiebreaker.status === 'nominated') && (
        <div className="space-y-2">
          <p className="text-xs text-amber-800">
            Sealed nominations: each player picks one event they both competed in. Picks stay hidden until both are in,
            and the head-to-head results across the two events decide the place.
          </p>
          {isInvolved && !tiebreaker.viewerNominated && (
            tiebreaker.nominatableEvents.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={eventId}
                  onChange={(e) => setEventId(e.target.value)}
                  aria-label="Event to nominate"
                  className="rounded-md border border-amber-300 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">Choose an event…</option>
                  {tiebreaker.nominatableEvents.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!eventId || busy}
                  onClick={() => void post(`${base}/${tiebreaker.id}/nominate`, { nominated_event_id: eventId }, 'Nomination submitted', 'Failed to nominate')}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  Submit nomination
                </button>
              </div>
            ) : (
              <p className="text-xs font-medium text-amber-900">
                You have no confirmed events in common, so the host will decide.
              </p>
            )
          )}
          {isInvolved && tiebreaker.viewerNominated && (
            <p className="text-xs font-medium text-amber-900">Your nomination is in. Waiting for your opponent.</p>
          )}
        </div>
      )}

      {tiebreaker && tiebreaker.revealedNominations.length > 0 && tiebreaker.status !== 'resolved' && (
        <p className="text-xs text-amber-800">
          Nominations: {tiebreaker.revealedNominations.map((n) => `${nameOf(n.profileId)} chose ${n.eventName}`).join('; ')}.
          The results could not separate them.
        </p>
      )}

      {tiebreaker && tiebreaker.status !== 'resolved' && isHost && (
        <div className="flex flex-wrap items-center gap-2 border-t border-amber-200 pt-3">
          <span className="text-xs font-medium text-amber-900">Host decision:</span>
          {[tiebreaker.profileIdA, tiebreaker.profileIdB].map((profileId) => (
            <button
              key={profileId}
              type="button"
              disabled={busy}
              onClick={() => void post(`${base}/${tiebreaker.id}/resolve`, { winner_profile_id: profileId }, 'Tiebreaker settled', 'Failed to settle the tiebreaker')}
              className="rounded-md border border-amber-400 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >
              {nameOf(profileId)} takes the higher place
            </button>
          ))}
        </div>
      )}

      {tiebreaker?.status === 'resolved' && (
        <p className="text-xs font-medium text-amber-900">
          Tiebreaker settled {RESOLVED_BY_LABELS[tiebreaker.resolvedBy ?? ''] ?? ''}: {nameOf(tiebreaker.winnerProfileId)} takes
          the higher place in the final standings.
        </p>
      )}
    </div>
  );
}
