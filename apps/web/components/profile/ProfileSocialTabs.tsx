'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ROUTES from '@/constants/routes';

type SocialProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  country_code: string | null;
  followed_at: string;
};

interface FollowLists {
  followers: SocialProfile[];
  following: SocialProfile[];
}

interface Props {
  profileId: string;
}

function ProfileRow({ profile }: { profile: SocialProfile }) {
  return (
    <Link
      href={ROUTES.PROFILE(profile.id)}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-grey-50"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-grey-200">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt={profile.display_name} fill className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-grey-500">
            {profile.display_name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-grey-900">{profile.display_name}</p>
        <p className="truncate text-xs text-grey-500">{profile.bio || 'No bio yet'}</p>
      </div>
    </Link>
  );
}

export function ProfileSocialTabs({ profileId }: Props) {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [lists, setLists] = useState<FollowLists>({ followers: [], following: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadFollows() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/users/${profileId}/follows`);
        if (!response.ok) return;
        const json = (await response.json()) as { data: FollowLists };
        if (isMounted) setLists(json.data);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadFollows();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  const activeList = lists[activeTab];

  return (
    <section className="overflow-hidden rounded-lg border border-grey-200 bg-white">
      <div className="flex border-b border-grey-200">
        {(['followers', 'following'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              'flex-1 px-4 py-3 text-sm font-semibold capitalize transition-colors',
              activeTab === tab
                ? 'border-b-2 border-primary text-primary'
                : 'text-grey-500 hover:bg-grey-50 hover:text-grey-700',
            ].join(' ')}
          >
            {tab} ({lists[tab].length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-full bg-grey-200" />
              <div className="space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-grey-200" />
                <div className="h-3 w-44 animate-pulse rounded bg-grey-100" />
              </div>
            </div>
          ))}
        </div>
      ) : activeList.length === 0 ? (
        <div className="p-6 text-center text-sm text-grey-500">
          {activeTab === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
        </div>
      ) : (
        <div className="divide-y divide-grey-100">
          {activeList.map((profile) => (
            <ProfileRow key={profile.id} profile={profile} />
          ))}
        </div>
      )}
    </section>
  );
}
