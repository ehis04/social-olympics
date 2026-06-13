import LoginForm from '@/components/auth/LoginForm';

export const metadata = { title: 'Sign in — Social Olympics' };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Sign in to Social Olympics
      </h1>
      <LoginForm />
    </>
  );
}
