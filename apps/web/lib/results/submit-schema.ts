import { z } from 'zod';

export const ResultSubmissionSchema = z.object({
  competition_event_id: z.string().uuid(),
  profile_id: z.string().uuid().optional(),
  result_value: z.number().finite().nonnegative().optional(),
  result_value_primary: z.number().finite().nonnegative().optional(),
  is_dnf: z.boolean().default(false),
  notes: z.string().max(300).optional(),
  evidence_url: z.string().url().optional(),
}).superRefine((data, context) => {
  if (!data.is_dnf && data.result_value === undefined && data.result_value_primary === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Result value is required unless marking as DNF' });
  }
}).transform((data) => ({ ...data, result_value: data.is_dnf ? null : data.result_value_primary ?? data.result_value! }));
