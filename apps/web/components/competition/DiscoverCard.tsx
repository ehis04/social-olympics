'use client';

// Handles direct join from the Discover page for public competitions
import { useRouter } from 'next/navigation';
import CompetitionCard from '@/components/competition/CompetitionCard';
import { toast } from '@/lib/toast';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competition: CompetitionRow;
  isJoined?: boolean;
}

export default function DiscoverCard({ competition, isJoined = false }: Props) {
  const router = useRouter();

  async function handleJoin(id: string) {
    try {
      const res = await fetch(`/api/competitions/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? 'Failed to join competition');
        return;
      }

      toast.success('Joined competition!');
      router.replace(ROUTES.COMPETITION_FEED(id));
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    }
  }

  return (
    <CompetitionCard
      competition={competition}
      showJoinButton
      isJoined={isJoined}
      onJoin={handleJoin}
    />
  );
}
