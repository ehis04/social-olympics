// Content report schema.

import { z } from 'zod';

export const CreateReportSchema = z.object({
  target_type: z.enum(['competition', 'profile', 'message']),
  target_id: z.string().uuid(),
  reason: z.string().min(20).max(500),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
