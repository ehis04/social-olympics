// Weightlifting bid schema with kg precision validation.

import { z } from 'zod';

export const WeightliftingBidSchema = z.object({
  competition_event_id: z.string().uuid(),
  bid_weight_kg: z
    .number()
    .positive()
    .min(1)
    .max(500)
    .refine((v) => Math.round(v * 100) / 100 === v, {
      message: 'Weight must have at most 2 decimal places',
    }),
  bid_round: z.number().int().positive(),
});

export type WeightliftingBidInput = z.infer<typeof WeightliftingBidSchema>;
