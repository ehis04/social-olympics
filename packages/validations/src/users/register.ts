// Registration schema with 16+ age gate enforcement.

import { z } from 'zod';

import { MIN_AGE_YEARS } from '@repo/constants';

function parseDateOfBirth(value: string): Date | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const displayMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  const [, isoYear, isoMonth, isoDay] = isoMatch ?? [];
  const [, displayDay, displayMonth, displayYear] = displayMatch ?? [];
  const year = isoYear ?? displayYear;
  const month = isoMonth ?? displayMonth;
  const day = isoDay ?? displayDay;

  if (!year || !month || !day) {
    return null;
  }

  const parsedYear = Number(year);
  const parsedMonth = Number(month);
  const parsedDay = Number(day);
  const date = new Date(Date.UTC(parsedYear, parsedMonth - 1, parsedDay));

  if (
    date.getUTCFullYear() !== parsedYear ||
    date.getUTCMonth() !== parsedMonth - 1 ||
    date.getUTCDate() !== parsedDay
  ) {
    return null;
  }

  return date;
}

function isAtLeastMinimumAge(dob: string): boolean {
  const today = new Date();
  const birth = parseDateOfBirth(dob);

  if (!birth) {
    return false;
  }

  const age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = today.getUTCDate() - birth.getUTCDate();
  const exactAge =
    monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

  return exactAge >= MIN_AGE_YEARS;
}

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
    .refine((dob) => parseDateOfBirth(dob) !== null, 'Enter a valid date of birth')
    .refine(isAtLeastMinimumAge, 'You must be at least 16 years old to register'),
  country_code: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
  bio: z.string().max(500).optional(),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;
