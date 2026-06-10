// supabase/functions/_shared/auth.ts
// JWT extraction and verification for edge function requests

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AuthenticatedUser {
  profileId: string;
  role: string;
}

export async function getAuthenticatedUser(
  req: Request,
  supabaseClient: SupabaseClient,
): Promise<AuthenticatedUser> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error('Missing Authorization header');
  }

  const { data: { user }, error } = await supabaseClient.auth.getUser(
    authHeader.replace('Bearer ', ''),
  );

  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return {
    profileId: user.id,
    role: user.role ?? 'authenticated',
  };
}