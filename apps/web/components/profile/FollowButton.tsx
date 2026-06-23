// FollowButton — follow/unfollow another profile
'use client';

import { useEffect, useState } from 'react';
import { toast } from '@/lib/toast';

interface FollowState {
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

interface Props {
  profileId: string;
}

export function FollowButton({ profileId }: Props) {
  const [state, setState] = useState<FollowState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      try {
        const response = await fetch(`/api/users/${profileId}/follow`);
        if (!response.ok) return;
        const json = (await response.json()) as { data: FollowState };
        if (isMounted) setState(json.data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadState();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  async function toggleFollow() {
    setIsMutating(true);
    const method = state?.isFollowing ? 'DELETE' : 'POST';
    const response = await fetch(`/api/users/${profileId}/follow`, { method });
    setIsMutating(false);

    const json = (await response.json().catch(() => ({}))) as {
      data?: FollowState;
      error?: string;
    };

    if (!response.ok || !json.data) {
      toast.error(json.error ?? 'Failed to update follow');
      return;
    }

    setState(json.data);
    toast.success(json.data.isFollowing ? 'Following profile' : 'Unfollowed profile');
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={toggleFollow}
        disabled={isLoading || isMutating}
        className={
          state?.isFollowing
            ? 'rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50 disabled:opacity-60'
            : 'rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60'
        }
      >
        {isMutating ? 'Saving...' : state?.isFollowing ? 'Following' : 'Follow'}
      </button>
      {state && (
        <p className="text-xs text-grey-500">
          {state.followersCount} followers
        </p>
      )}
    </div>
  );
}
