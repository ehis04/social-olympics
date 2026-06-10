// Result confirmation schema.

import { z } from 'zod';

export const ConfirmResultSchema = z.object({
  result_id: z.string().uuid(),
  finishing_place: z.number().int().positive(),
  points_awarded: z.number().nonnegative(),
  participation_points: z.union([z.literal(0), z.literal(0.1)]),
});

export type ConfirmResultInput = z.infer<typeof ConfirmResultSchema>;
