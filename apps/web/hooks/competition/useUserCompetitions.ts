// TanStack Query hook for the current user's competitions list (used in sidebar)
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

async function fetchUserCompetitions(): Promise<CompetitionRow[]> {
  const res = await fetch('/api/competitions/user');
  if (!res.ok) return [];
  const json = await res.json();
  return (json.data ?? []) as CompetitionRow[];
}

export function useUserCompetitions() {
  const { session } = useAuth();

  const { data = [], ...rest } = useQuery({
    queryKey: ['competitions', 'user'],
    queryFn: fetchUserCompetitions,
    enabled: !!session,
    staleTime: 5 * 60 * 1000,
  });

  return { competitions: data, ...rest };
}
