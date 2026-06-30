import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import RegisterForm from '@/components/auth/RegisterForm';
import ROUTES from '@/constants/routes';

export const metadata = { title: 'Create account: Social Olympics' };

export default async function RegisterPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (user) redirect(ROUTES.DASHBOARD);

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Create your account
      </h1>
      <RegisterForm />
    </>
  );
}
