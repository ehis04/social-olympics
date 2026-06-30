import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata = { title: 'Choose a new password: Social Olympics' };

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="mb-2 text-center text-2xl font-bold text-grey-900">Choose a new password</h1>
      <p className="mb-6 text-center text-sm text-grey-600">
        Enter a new password for your account. You&apos;ll sign in again after it&apos;s updated.
      </p>
      <ResetPasswordForm />
    </div>
  );
}
