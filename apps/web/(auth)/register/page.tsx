import RegisterForm from '@/components/auth/RegisterForm';

export const metadata = { title: 'Create account — Social Olympics' };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Create your account
      </h1>
      <RegisterForm />
    </>
  );
}
