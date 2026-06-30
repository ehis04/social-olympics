// TiebreakerBanner — displayed when two or more competitors share a rank
'use client';

import { useState } from 'react';
import type { RankedMember } from '@/hooks/leaderboard/useLeaderboard';

interface Props {
  tiedEntries: RankedMember[];
  currentUserId: string;
  isHost: boolean;
  competitionId: string;
  onInitiate: (profileIdA: string, profileIdB: string) => void;
}

export function TiebreakerBanner({ tiedEntries, currentUserId, isHost, onInitiate }: Props) {
  const [expanded, setExpanded] = useState(false);

  const names = tiedEntries
    .map((e) => e.profiles?.display_name ?? 'Unknown')
    .join(' and ');

  const isInvolved = tiedEntries.some((e) => e.profile_id === currentUserId);
  if (!isInvolved && !isHost) return null;

  const handleInitiate = () => {
    if (tiedEntries.length >= 2) {
      const a = tiedEntries[0]?.profile_id;
      const b = tiedEntries[1]?.profile_id;
      if (a && b) onInitiate(a, b);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-red-700">
          Tie detected: tiebreaker required between {names}
        </p>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 text-xs text-red-500 underline"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>

      {expanded && (
        <p className="text-xs text-red-600">
          Each tied competitor must nominate one event they both contested. Selections are hidden
          until both submit. The head-to-head result across those two events determines the winner.
        </p>
      )}

      {isHost && (
        <button
          onClick={handleInitiate}
          className="mt-1 self-start rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
        >
          Initiate Tiebreaker
        </button>
      )}

      {isInvolved && !isHost && (
        <p className="text-xs font-medium text-red-600">
          Waiting for the host to initiate the tiebreaker process.
        </p>
      )}
    </div>
  );
}
