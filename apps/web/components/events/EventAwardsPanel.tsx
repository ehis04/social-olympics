/*
 * This file defines the EventAwardsPanel user-interface component.
 */

'use client';

// EventAwardsPanel — shows finalised MVP / worst-performer awards and lets the host finalise them.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ThumbsDown, Trophy } from 'lucide-react';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';

export interface AwardWinner {
  profileId: string;
  displayName: string;
  voteCount: number;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  mvpEnabled: boolean;
  worstEnabled: boolean;
  mvp: AwardWinner | null;
  worst: AwardWinner | null;
  isHost: boolean;
  canFinalise: boolean;
  ballotCounts: { mvp: number; worst: number } | null;
}

interface AwardOutcome {
  voteType: 'mvp' | 'worst_performer';
  status: 'awarded' | 'no_votes' | 'already_final' | 'disabled';
}

// Renders the event awards panel component.
export function EventAwardsPanel({
  competitionId,
  competitionEventId,
  mvpEnabled,
  worstEnabled,
  mvp,
  worst,
  isHost,
  canFinalise,
  ballotCounts,
}: Props) {
  const router = useRouter();
  const [isFinalising, setIsFinalising] = useState(false);

  if (!mvpEnabled && !worstEnabled) return null;

  const pending = (mvpEnabled && !mvp) || (worstEnabled && !worst);
  const showFinalise = isHost && canFinalise && pending;
  if (!mvp && !worst && !showFinalise) return null;

  async function handleFinalise() {
    setIsFinalising(true);
    try {
      const res = await fetch(`/api/competitions/${competitionId}/events/${competitionEventId}/vote-results`, {
        method: 'POST',
      });
      const json = await readJson(res);
      if (!res.ok) {
        toast.error(getApiErrorMessage(json, 'Failed to finalise awards'));
        return;
      }
      const outcomes = ((json as { data: { outcomes: AwardOutcome[] } }).data?.outcomes ?? []);
      const awarded = outcomes.filter((outcome) => outcome.status === 'awarded').length;
      const empty = outcomes.filter((outcome) => outcome.status === 'no_votes');
      if (awarded > 0) toast.success(awarded === 1 ? 'Award finalised' : 'Awards finalised');
      if (empty.length > 0) {
        toast.info(
          `No ${empty.map((outcome) => (outcome.voteType === 'mvp' ? 'MVP' : 'worst performer')).join(' or ')} votes yet, so that vote stays open.`,
        );
      }
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setIsFinalising(false);
    }
  }

  return (
    <section className="rounded-lg border border-grey-200 bg-white p-5" aria-label="Event awards">
      <h2 className="mb-3 text-sm font-semibold text-grey-700">Awards</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {mvpEnabled && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-50 px-3 py-2.5">
            <Trophy className="h-4 w-4 shrink-0 text-amber-600" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-grey-800">MVP</p>
              <p className="truncate text-grey-600">
                {mvp ? `${mvp.displayName} · ${mvp.voteCount} vote${mvp.voteCount === 1 ? '' : 's'} (+1 pt)` : 'Voting open'}
              </p>
            </div>
          </div>
        )}
        {worstEnabled && (
          <div className="flex items-center gap-3 rounded-lg bg-grey-50 px-3 py-2.5">
            <ThumbsDown className="h-4 w-4 shrink-0 text-grey-500" />
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-grey-800">Worst performer</p>
              <p className="truncate text-grey-600">
                {worst ? `${worst.displayName} · ${worst.voteCount} vote${worst.voteCount === 1 ? '' : 's'} (−1 pt)` : 'Voting open'}
              </p>
            </div>
          </div>
        )}
      </div>

      {showFinalise && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-grey-100 pt-4">
          <p className="text-xs text-grey-500">
            {ballotCounts
              ? `Ballots so far: ${mvpEnabled ? `${ballotCounts.mvp} MVP` : ''}${mvpEnabled && worstEnabled ? ', ' : ''}${worstEnabled ? `${ballotCounts.worst} worst performer` : ''}. `
              : ''}
            Finalising awards the bonus points and closes these votes. Ties are settled at random.
          </p>
          <button
            type="button"
            onClick={() => void handleFinalise()}
            disabled={isFinalising}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            {isFinalising ? 'Finalising…' : 'Finalise awards'}
          </button>
        </div>
      )}
    </section>
  );
}
