/*
 * This file renders the login application page.
 */

import { redirect } from 'next/navigation';
import type { Route } from 'next';
import { getServerClient } from '@/lib/supabase/server';
import LoginForm from '@/components/auth/LoginForm';
import { getSafeNextPath } from '@/lib/auth/safe-next';

export const metadata = { title: 'Sign in: Social Olympics' };

interface Props {
  searchParams: Promise<{ next?: string; message?: string }>;
}

// Renders the login page component.
export default async function LoginPage({ searchParams }: Props) {
  const { next, message } = await searchParams;
  const nextPath = getSafeNextPath(next);
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (user) redirect(nextPath as Route);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Sign in to Social Olympics
      </h1>
      {message && (
        <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary-muted px-3 py-2 text-sm text-grey-700">
          {message.slice(0, 300)}
        </p>
      )}
      <LoginForm next={next ? nextPath : null} />
    </>
  );
}
