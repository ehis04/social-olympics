// Invite by email and join by code schemas.

import { z } from 'zod';

import { INVITE_CODE_LENGTH } from '@repo/constants';

export const InviteByEmailSchema = z.object({
  email: z.string().email(),
  role: z.enum(['competitor', 'spectator', 'cohost']),
});

export const JoinByCodeSchema = z.object({
  invite_code: z
    .string()
    .transform((v) => v.toUpperCase())
    .refine((v) => v.length === INVITE_CODE_LENGTH, {
      message: `Invite code must be exactly ${String(INVITE_CODE_LENGTH)} characters`,
    }),
});

export type InviteByEmailInput = z.infer<typeof InviteByEmailSchema>;
export type JoinByCodeInput = z.infer<typeof JoinByCodeSchema>;
