import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata = { title: 'Reset password: Social Olympics' };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold text-grey-800">
        Reset your password
      </h1>
      <ForgotPasswordForm />
    </>
  );
}
