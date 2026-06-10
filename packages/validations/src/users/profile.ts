// Profile update schema.

import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  display_name: z.string().min(2).max(30).optional(),
  avatar_url: z.string().url().optional(),
  country_code: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
  favourite_sport: z.string().max(60).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
