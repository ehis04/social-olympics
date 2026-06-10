// Schema for creating a custom event.

import { z } from 'zod';

export const CreateCustomEventSchema = z
  .object({
    name: z.string().min(3).max(60),
    category_id: z.string().uuid(),
    result_type: z.enum([
      'time', 'distance', 'score', 'inverted_score', 'weight', 'compound', 'possession',
    ]),
    is_team_event: z.boolean(),
    min_team_size: z.number().int().min(2).max(12).optional(),
    max_team_size: z.number().int().min(2).max(12).optional(),
    description: z.string().max(500).optional(),
    scoring_notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.min_team_size !== undefined &&
      data.max_team_size !== undefined &&
      data.max_team_size < data.min_team_size
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['max_team_size'],
        message: 'max_team_size must be >= min_team_size',
      });
    }
  });

export type CreateCustomEventInput = z.infer<typeof CreateCustomEventSchema>;
