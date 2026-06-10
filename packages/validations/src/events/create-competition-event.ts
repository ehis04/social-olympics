// Schema for adding an event to a competition with weight config.

import { z } from 'zod';

import { CUSTOM_WEIGHT_MULTIPLIER_MAX, CUSTOM_WEIGHT_MULTIPLIER_MIN, WEIGHT_TAG_MULTIPLIERS } from '@repo/constants';

export const CreateCompetitionEventSchema = z
  .object({
    event_id: z.string().uuid(),
    weight_tag: z.enum(['not_important', 'standard', 'important', 'very_important', 'custom']),
    weight_multiplier: z
      .number()
      .min(CUSTOM_WEIGHT_MULTIPLIER_MIN)
      .max(CUSTOM_WEIGHT_MULTIPLIER_MAX),
    scheduled_at: z
      .string()
      .refine((v) => new Date(v) > new Date(), { message: 'Must be a future date' })
      .optional(),
    sequence_order: z.number().int().positive(),
    name_override: z.string().max(60).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.weight_tag !== 'custom') {
      const expected = WEIGHT_TAG_MULTIPLIERS[data.weight_tag];
      if (expected !== undefined && data.weight_multiplier !== expected) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['weight_multiplier'],
          message: `Multiplier for '${data.weight_tag}' must be ${String(expected)}`,
        });
      }
    }
  });

export type CreateCompetitionEventInput = z.infer<typeof CreateCompetitionEventSchema>;
