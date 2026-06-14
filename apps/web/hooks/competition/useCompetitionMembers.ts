// TanStack Query hook for a competition's members list
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/auth/useAuth';
import type { Database } from '@repo/types';

type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

async function fetchMembers(id: string): Promise<MemberWithProfile[]> {
  const res = await fetch(`/api/competitions/${id}/members`);
  if (!res.ok) throw new Error('Failed to fetch members');
  const json = await res.json();
  return (json.data ?? []) as MemberWithProfile[];
}

export function useCompetitionMembers(id: string | undefined) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['competition', id, 'members'],
    queryFn: () => fetchMembers(id!),
    enabled: !!session && !!id,
    staleTime: 30_000,
  });
}
