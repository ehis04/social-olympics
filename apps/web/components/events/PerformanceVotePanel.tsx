'use client';

// PerformanceVotePanel — MVP and worst-performer voting widget for confirmed events
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Trophy, ThumbsDown, CheckCircle } from 'lucide-react';
import { toast } from '@/lib/toast';

interface Competitor {
  profileId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Props {
  competitionId: string;
  competitionEventId: string;
  competitors: Competitor[];
  mvpEnabled: boolean;
  worstPerformerEnabled: boolean;
  currentUserId: string;
  existingMvpVote: string | null;
  existingWorstVote: string | null;
}

type VoteType = 'mvp' | 'worst_performer';

interface VoteState {
  mvp: string | null;
  worst: string | null;
}

function AvatarCircle({ displayName, avatarUrl, size = 8 }: { displayName: string; avatarUrl: string | null; size?: number }) {
  const cls = `h-${size} w-${size}`;
  return (
    <div className={`relative ${cls} shrink-0 overflow-hidden rounded-full bg-grey-200`}>
      {avatarUrl ? (
        <Image src={avatarUrl} alt={displayName} fill className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-grey-500">
          {displayName.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

export function PerformanceVotePanel({
  competitionId,
  competitionEventId,
  competitors,
  mvpEnabled,
  worstPerformerEnabled,
  currentUserId,
  existingMvpVote,
  existingWorstVote,
}: Props) {
  const router = useRouter();
  const [votes, setVotes] = useState<VoteState>({
    mvp: existingMvpVote,
    worst: existingWorstVote,
  });
  const [submitting, setSubmitting] = useState<VoteType | null>(null);

  async function handleVote(profileId: string, voteType: VoteType) {
    setSubmitting(voteType);
    try {
      const res = await fetch(
        `/api/competitions/${competitionId}/events/${competitionEventId}/vote`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voted_for_profile_id: profileId, vote_type: voteType }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Failed to submit vote');
        return;
      }
      setVotes((prev) => ({
        ...prev,
        [voteType === 'mvp' ? 'mvp' : 'worst']: profileId,
      }));
      toast.success(voteType === 'mvp' ? 'MVP vote submitted' : 'Worst performer vote submitted');
      router.refresh();
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(null);
    }
  }

  const eligibleForMvp = competitors.filter((c) => c.profileId !== currentUserId);
  const eligibleForWorst = competitors.filter((c) => c.profileId !== currentUserId);

  if (!mvpEnabled && !worstPerformerEnabled) return null;

  return (
    <div className="space-y-4 rounded-lg border border-grey-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-grey-700">Event Voting</h3>

      {mvpEnabled && (
        <VoteSection
          title="MVP"
          icon={<Trophy size={14} className="text-gold" />}
          description="Who performed best in this event?"
          competitors={eligibleForMvp}
          selectedId={votes.mvp}
          voteType="mvp"
          submitting={submitting === 'mvp'}
          onVote={(id) => handleVote(id, 'mvp')}
        />
      )}

      {worstPerformerEnabled && (
        <VoteSection
          title="Worst Performer"
          icon={<ThumbsDown size={14} className="text-grey-400" />}
          description="Who struggled most in this event?"
          competitors={eligibleForWorst}
          selectedId={votes.worst}
          voteType="worst_performer"
          submitting={submitting === 'worst_performer'}
          onVote={(id) => handleVote(id, 'worst_performer')}
        />
      )}
    </div>
  );
}

interface VoteSectionProps {
  title: string;
  icon: React.ReactNode;
  description: string;
  competitors: Competitor[];
  selectedId: string | null;
  voteType: VoteType;
  submitting: boolean;
  onVote: (profileId: string) => void;
}

function VoteSection({ title, icon, description, competitors, selectedId, voteType, submitting, onVote }: VoteSectionProps) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-xs font-semibold text-grey-700">{title}</span>
      </div>
      <p className="mb-3 text-xs text-grey-500">{description}</p>
      {selectedId ? (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3 py-2">
          <CheckCircle size={14} className="text-green-600 shrink-0" />
          <span className="text-xs font-medium text-green-800">
            Vote submitted — you can change it by selecting another competitor
          </span>
        </div>
      ) : null}
      <ul className="mt-2 space-y-1.5">
        {competitors.map((c) => {
          const isSelected = selectedId === c.profileId;
          return (
            <li key={c.profileId}>
              <button
                onClick={() => onVote(c.profileId)}
                disabled={submitting}
                className={[
                  'flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors disabled:opacity-60',
                  isSelected
                    ? 'border-primary bg-primary/5 font-semibold text-primary'
                    : 'border-grey-200 bg-white text-grey-700 hover:border-grey-300 hover:bg-grey-50',
                ].join(' ')}
              >
                <AvatarCircle displayName={c.displayName} avatarUrl={c.avatarUrl} size={7} />
                <span className="flex-1 truncate">{c.displayName}</span>
                {isSelected && <CheckCircle size={14} className="shrink-0 text-primary" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
