'use client';

// Button that triggers the ghost profile claim API call
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import ROUTES from '@/constants/routes';

interface Props {
  ghostProfileId: string;
}

export default function ClaimProfileButton({ ghostProfileId }: Props) {
  const router = useRouter();
  const [isClaiming, setIsClaiming] = useState(false);

  async function handleClaim() {
    setIsClaiming(true);
    try {
      const res = await fetch(`/api/claim/${ghostProfileId}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? 'Failed to claim profile');
        return;
      }
      toast.success('Profile claimed! Your history has been transferred.');
      router.replace(ROUTES.COMPETITION_FEED(json.data.competitionId));
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsClaiming(false);
    }
  }

  return (
    <button
      onClick={handleClaim}
      disabled={isClaiming}
      className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
    >
      {isClaiming ? 'Claiming…' : 'Claim this profile'}
    </button>
  );
}
