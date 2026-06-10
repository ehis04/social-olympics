// Result submission schema with DNF cross-field validation.

import { z } from 'zod';

export const SubmitResultSchema = z
  .object({
    competition_event_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    result_value_primary: z.number().optional(),
    result_value_secondary: z.number().optional(),
    is_dnf: z.boolean().default(false),
    evidence_url: z.string().url().optional(),
    notes: z.string().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.is_dnf && data.result_value_primary === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['result_value_primary'],
        message: 'Result value is required unless marking as DNF',
      });
    }
  });

export type SubmitResultInput = z.infer<typeof SubmitResultSchema>;
