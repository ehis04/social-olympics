'use client';

// StrengthVoteWidget — lets members confirm or reject a competitor's self-declared strength rating
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ThumbsUp, ThumbsDown, CheckCircle, Info } from 'lucide-react';
import { toast } from '@/lib/toast';

interface TeamMemberRating {
  teamMemberId: string;
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
  strengthRating: number;
  ratingSource: string;
  submissionRound: 1 | 2;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  pendingRatings: TeamMemberRating[];
  currentUserId: string;
}

interface VotedSet {
  [teamMemberId: string]: 'confirm' | 'reject';
}

export function StrengthVoteWidget({
  competitionId,
  competitionEventId,
  pendingRatings,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [voted, setVoted] = useState<VotedSet>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const unvotedRatings = pendingRatings.filter(
    (r) => r.profileId !== currentUserId && !voted[r.teamMemberId],
  );

  async function handleVote(rating: TeamMemberRating, vote: 'confirm' | 'reject') {
    setSubmitting(rating.teamMemberId);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/events/${competitionEventId}/strength-vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_member_id: rating.teamMemberId,
            vote,
            submission_round: rating.submissionRound,
          }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to submit vote');
        return;
      }

      setVoted((prev) => ({ ...prev, [rating.teamMemberId]: vote }));

      const outcome = json.data?.outcome as string | undefined;
      if (outcome === 'confirmed') {
        toast.success(`${rating.displayName}'s rating confirmed by peers`);
      } else if (outcome === 'round2_required') {
        toast.info(`Rating disputed: round 2 vote required`);
      } else if (outcome === 'host_required') {
        toast.info(`Rating disputed: host will decide`);
      } else {
        toast.success('Vote recorded');
      }

      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(null);
    }
  }

  if (pendingRatings.length === 0) return null;

  if (unvotedRatings.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle size={15} className="shrink-0 text-green-600" />
        <p className="text-sm font-medium text-green-800">
          You have voted on all pending strength ratings
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-white p-5 space-y-4">
      <div className="flex items-start gap-2">
        <Info size={15} className="mt-0.5 shrink-0 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-grey-700">Strength Rating Votes</h3>
          <p className="mt-0.5 text-xs text-grey-500">
            Vote to confirm or dispute each competitor&apos;s self-declared strength rating before teams are assigned.
          </p>
        </div>
      </div>

      <ul className="space-y-3">
        {unvotedRatings.map((rating) => (
          <li
            key={rating.teamMemberId}
            className="flex items-center gap-3 rounded-lg border border-grey-100 bg-grey-50 px-4 py-3"
          >
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-grey-200">
              {rating.avatarUrl ? (
                <Image src={rating.avatarUrl} alt={rating.displayName} fill className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-grey-500">
                  {rating.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-grey-800">{rating.displayName}</p>
              <p className="text-xs text-grey-500">
                Self-rated <span className="font-semibold text-grey-700">{rating.strengthRating}/10</span>
                {rating.submissionRound === 2 && (
                  <span className="ml-1.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-700">
                    Round 2
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleVote(rating, 'confirm')}
                disabled={submitting === rating.teamMemberId}
                className="flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-100 disabled:opacity-60 transition-colors"
              >
                <ThumbsUp size={12} />
                Confirm
              </button>
              <button
                onClick={() => handleVote(rating, 'reject')}
                disabled={submitting === rating.teamMemberId}
                className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-60 transition-colors"
              >
                <ThumbsDown size={12} />
                Dispute
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
