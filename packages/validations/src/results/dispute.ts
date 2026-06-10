// Dispute raising schema.

import { z } from 'zod';

export const RaiseDisputeSchema = z.object({
  result_id: z.string().uuid(),
  reason: z.string().min(20).max(500),
});

export type RaiseDisputeInput = z.infer<typeof RaiseDisputeSchema>;
