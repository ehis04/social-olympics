// Registration schema with 16+ age gate enforcement.

import { z } from 'zod';

import { MIN_AGE_YEARS } from '@repo/constants';

export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a digit'),
  display_name: z.string().min(2).max(30),
  date_of_birth: z
    .string()
    .refine((dob) => {
      const today = new Date();
      const birth = new Date(dob);
      const age = today.getUTCFullYear() - birth.getUTCFullYear();
      const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
      const dayDiff = today.getUTCDate() - birth.getUTCDate();
      const exactAge =
        monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;
      return exactAge >= MIN_AGE_YEARS;
    }, 'You must be at least 16 years old to register'),
  country_code: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
