/*
 * This file defines the DiscoverCard user-interface component.
 */

'use client';

// Handles direct join from the Discover page for public competitions
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import CompetitionCard from '@/components/competition/CompetitionCard';
import { toast } from '@/lib/toast';
import { getApiErrorMessage, readJson } from '@/lib/api/error-message';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  competition: CompetitionRow;
  isJoined?: boolean;
}

// Renders the discover card component.
export default function DiscoverCard({ competition, isJoined = false }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleJoin(id: string) {
    try {
      const res = await fetch(`/api/competitions/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await readJson(res);

      if (!res.ok) {
        toast.error(getApiErrorMessage(json, 'Failed to join competition'));
        return;
      }

      const joined = (json as { data?: { alreadyMember?: boolean; role?: string } }).data;
      toast.success(
        joined?.alreadyMember
          ? "You're already a member"
          : joined?.role === 'spectator'
            ? 'You joined as a spectator because the competition has already started. The host can make you a competitor.'
            : 'Joined competition!',
      );
      void queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
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
