// TanStack Query mutation hook for joining a competition by invite code or direct join
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import ROUTES from '@/constants/routes';

interface JoinByCodePayload {
  invite_code: string;
}

interface JoinDirectPayload {
  competition_id: string;
}

type JoinPayload = JoinByCodePayload | JoinDirectPayload;

async function joinCompetition(payload: JoinPayload): Promise<{ competitionId: string }> {
  if ('invite_code' in payload) {
    const res = await fetch('/api/competitions/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to join');
    return json.data as { competitionId: string };
  } else {
    const res = await fetch(`/api/competitions/${payload.competition_id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? 'Failed to join');
    return { competitionId: payload.competition_id };
  }
}

export function useJoinCompetition() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: joinCompetition,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
      toast.success('Joined competition!');
      router.replace(ROUTES.COMPETITION_FEED(data.competitionId));
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
