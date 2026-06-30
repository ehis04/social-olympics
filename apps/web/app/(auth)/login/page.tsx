import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import LoginForm from '@/components/auth/LoginForm';
import ROUTES from '@/constants/routes';

export const metadata = { title: 'Sign in: Social Olympics' };

export default async function LoginPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (user) redirect(ROUTES.DASHBOARD);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Sign in to Social Olympics
      </h1>
      <LoginForm />
    </>
  );
}
