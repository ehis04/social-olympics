// Content report schema.

import { z } from 'zod';

export const CreateReportSchema = z.object({
  target_type: z.enum(['competition', 'profile', 'message', 'feed_item']),
  target_id: z.string().uuid(),
  competition_id: z.string().uuid().optional(),
  reason: z.string().min(5).max(500),
});

export type CreateReportInput = z.infer<typeof CreateReportSchema>;
