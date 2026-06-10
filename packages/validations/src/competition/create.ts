// Competition creation schema.

import { z } from 'zod';

export const CreateCompetitionSchema = z.object({
  name: z.string().min(3).max(60),
  description: z.string().max(500).optional(),
  is_public: z.boolean(),
  country_code: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  min_events_required: z.number().int().positive(),
  mvp_voting_enabled: z.boolean().default(true),
  worst_performer_enabled: z.boolean().default(true),
  prize_pot_per_person: z.number().positive().optional(),
});

export type CreateCompetitionInput = z.infer<typeof CreateCompetitionSchema>;
