// TanStack Query hook for competition leaderboard
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';

export interface RankedMember {
  profile_id: string;
  rank: number;
  isTied: boolean;
  total_points: number;
  gold_count: number;
  silver_count: number;
  bronze_count: number;
  events_completed: number;
  profiles?: {
    display_name: string;
    avatar_url: string | null;
    country_code: string | null;
  };
}

async function fetchLeaderboard(competitionId: string): Promise<RankedMember[]> {
  const res = await fetch(`/api/competitions/${competitionId}/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  const json = await res.json();
  return json.data as RankedMember[];
}

export function useLeaderboard(competitionId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['competition', competitionId, 'leaderboard'],
    queryFn: () => fetchLeaderboard(competitionId!),
    enabled: !!session && !!competitionId,
    staleTime: 10_000,
  });
}

async function fetchTeamLeaderboard(competitionId: string): Promise<unknown[]> {
  const res = await fetch(`/api/competitions/${competitionId}/leaderboard/teams`);
  if (!res.ok) throw new Error('Failed to fetch team leaderboard');
  const json = await res.json();
  return json.data as unknown[];
}

export function useTeamLeaderboard(competitionId: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['competition', competitionId, 'leaderboard', 'teams'],
    queryFn: () => fetchTeamLeaderboard(competitionId!),
    enabled: !!session && !!competitionId,
    staleTime: 10_000,
  });
}