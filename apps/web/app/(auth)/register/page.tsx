/*
 * This file renders the register application page.
 */

import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import RegisterForm from '@/components/auth/RegisterForm';
import type { Route } from 'next';
import { getSafeNextPath } from '@/lib/auth/safe-next';

export const metadata = { title: 'Create account: Social Olympics' };

interface Props {
  searchParams: Promise<{ next?: string }>;
}

// Renders the register page component.
export default async function RegisterPage({ searchParams }: Props) {
  const { next } = await searchParams;
  const nextPath = getSafeNextPath(next);
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (user) redirect(nextPath as Route);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Create your account
      </h1>
      <RegisterForm next={next ? nextPath : null} />
    </>
  );
}
