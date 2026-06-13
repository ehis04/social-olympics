'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { z } from 'zod';
import { createBrowserClient } from '@repo/supabase';

const ForgotSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});
type ForgotInput = z.infer<typeof ForgotSchema>;

export default function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotInput>({
    resolver: zodResolver(ForgotSchema),
  });

  async function onSubmit(values: ForgotInput) {
    const supabase = createBrowserClient();
    await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/api/auth/callback?next=/profile/settings`,
    });
    // Always show success regardless of whether the email exists (security)
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded bg-green-50 px-4 py-3 text-sm text-success">
          If an account exists for this email, a reset link has been sent.
        </p>
        <Link
          href="/login"
          className="text-center text-sm font-semibold text-primary hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-grey-600">
        Enter your email address and we&apos;ll send you a link to reset your password.
      </p>

      <div className="flex flex-col gap-1">
        <label htmlFor="forgot-email" className="text-xs font-semibold text-grey-800">
          Email
        </label>
        <input
          id="forgot-email"
          type="email"
          autoComplete="email"
          className="rounded border border-grey-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {isSubmitting ? 'Sending…' : 'Send reset link'}
      </button>

      <Link
        href="/login"
        className="text-center text-xs text-grey-600 hover:underline"
      >
        Back to sign in
      </Link>
    </form>
  );
}
