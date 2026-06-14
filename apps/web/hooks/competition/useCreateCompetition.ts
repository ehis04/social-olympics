// TanStack Query mutation hook for creating a competition
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import ROUTES from '@/constants/routes';

interface CreatePayload {
  [key: string]: unknown;
}

async function createCompetition(payload: CreatePayload): Promise<{ id: string }> {
  const res = await fetch('/api/competitions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to create competition');
  return json.data as { id: string };
}

export function useCreateCompetition() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: createCompetition,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['competitions', 'user'] });
      toast.success('Competition created!');
      router.replace(ROUTES.COMPETITION_FEED(data.id));
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
