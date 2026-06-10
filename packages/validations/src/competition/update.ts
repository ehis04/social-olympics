// Competition update schema with status field.

import { z } from 'zod';

import { CreateCompetitionSchema } from './create';

export const UpdateCompetitionSchema = CreateCompetitionSchema.partial().extend({
  status: z
    .enum(['setup', 'open', 'active', 'complete', 'archived'])
    .optional(),
});

export type UpdateCompetitionInput = z.infer<typeof UpdateCompetitionSchema>;
