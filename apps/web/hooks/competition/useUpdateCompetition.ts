// TanStack Query mutation hook for updating competition settings
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';

interface UpdatePayload {
  [key: string]: unknown;
}

async function updateCompetition(id: string, payload: UpdatePayload): Promise<void> {
  const res = await fetch(`/api/competitions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Failed to update competition');
}

export function useUpdateCompetition(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdatePayload) => updateCompetition(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competition', id] });
      toast.success('Settings saved');
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
