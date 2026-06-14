// TanStack Query hook for a single competition by ID
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

async function fetchCompetition(id: string): Promise<CompetitionRow> {
  const res = await fetch(`/api/competitions/${id}`);
  if (!res.ok) throw new Error('Failed to fetch competition');
  const json = await res.json();
  return json.data as CompetitionRow;
}

export function useCompetition(id: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['competition', id],
    queryFn: () => fetchCompetition(id!),
    enabled: !!session && !!id,
    staleTime: 30_000,
  });
}
