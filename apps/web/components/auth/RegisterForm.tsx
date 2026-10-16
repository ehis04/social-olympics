/*
 * This file defines the RegisterForm user-interface component.
 */

'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@repo/supabase';
import { RegisterSchema, type RegisterInput } from '@repo/validations';
import type { Route } from 'next';
import { toast } from '@/lib/toast';
import { getSafeNextPath, withNext } from '@/lib/auth/safe-next';

const COUNTRIES = [
  { code: 'IE', name: 'Ireland' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'AU', name: 'Australia' },
  { code: 'CA', name: 'Canada' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PL', name: 'Poland' },
  { code: 'SE', name: 'Sweden' },
  { code: 'NO', name: 'Norway' },
  { code: 'DK', name: 'Denmark' },
  { code: 'NZ', name: 'New Zealand' },
  { code: 'ZA', name: 'South Africa' },
  { code: 'BR', name: 'Brazil' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
];

// Handles get password strength.
function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: 'bg-grey-200', width: 'w-0' };
  if (password.length < 6) return { label: 'Weak', color: 'bg-error', width: 'w-1/4' };
  if (password.length < 10) return { label: 'Fair', color: 'bg-warning', width: 'w-2/4' };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password))
    return { label: 'Strong', color: 'bg-success', width: 'w-full' };
  return { label: 'Good', color: 'bg-primary', width: 'w-3/4' };
}

// Renders the register form component.
export default function RegisterForm({ next = null }: { next?: string | null }) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
  });

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });
  const strength = getPasswordStrength(passwordValue);

  async function onSubmit(values: RegisterInput) {
    const supabase = createBrowserClient();
    const safeNext = getSafeNextPath(next);
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(safeNext)}`,
        data: {
          display_name: values.display_name,
          date_of_birth: values.date_of_birth,
          country_code: values.country_code ?? null,
        },
      },
    });

    if (error) {
      setError('root', { message: error.message });
      toast.error(error.message);
      return;
    }

    // When email confirmation is required, Supabase creates the account without a session.
    if (!data.session) {
      setConfirmationEmail(values.email);
      return;
    }

    toast.success('Account created! Welcome to Social Olympics.');
    router.replace(safeNext as Route);
    router.refresh();
  }

  if (confirmationEmail) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-grey-700">
          We sent a confirmation link to <span className="font-semibold">{confirmationEmail}</span>.
          Open it to activate your account, then sign in.
        </p>
        <p className="text-xs text-grey-500">
          No email after a few minutes? Check your spam folder. If you already have an account with this
          address, no new email is sent: sign in, or use{' '}
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">Forgot password</Link>.
        </p>
        <Link href={withNext('/login', next) as Route} className="inline-block text-sm font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-1">
        <label htmlFor="display_name" className="text-xs font-semibold text-grey-800">
          Display name
        </label>
        <input
          id="display_name"
          type="text"
          autoComplete="name"
          className="rounded border border-grey-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          {...register('display_name')}
        />
        {errors.display_name && (
          <p className="text-xs text-error">{errors.display_name.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reg-email" className="text-xs font-semibold text-grey-800">
          Email
        </label>
        <input
          id="reg-email"
          type="email"
          autoComplete="email"
          className="rounded border border-grey-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          {...register('email')}
        />
        {errors.email && (
          <p className="text-xs text-error">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="reg-password" className="text-xs font-semibold text-grey-800">
          Password
        </label>
        <div className="relative">
          <input
            id="reg-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="w-full rounded border border-grey-200 px-3 py-2 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {passwordValue && (
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1 flex-1 rounded bg-grey-200">
              <div className={`h-1 rounded transition-all ${strength.color} ${strength.width}`} />
            </div>
            <span className="text-xs text-grey-600">{strength.label}</span>
          </div>
        )}
        {errors.password && (
          <p className="text-xs text-error">{errors.password.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="date_of_birth" className="text-xs font-semibold text-grey-800">
          Date of birth
        </label>
        <input
          id="date_of_birth"
          type="date"
          className="rounded border border-grey-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          {...register('date_of_birth')}
        />
        {errors.date_of_birth && (
          <p className="text-xs text-error">{errors.date_of_birth.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="country_code" className="text-xs font-semibold text-grey-800">
          Country <span className="font-normal text-grey-400">(optional)</span>
        </label>
        <select
          id="country_code"
          className="rounded border border-grey-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          {...register('country_code')}
        >
          <option value="">Select country…</option>
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
        {errors.country_code && (
          <p className="text-xs text-error">{errors.country_code.message}</p>
        )}
      </div>

      {errors.root && (
        <p className="rounded bg-red-50 px-3 py-2 text-sm text-error">
          {errors.root.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {isSubmitting ? 'Creating account…' : 'Create account'}
      </button>

      <p className="text-center text-xs text-grey-500">
        By creating an account you agree to the{' '}
        <Link href="/terms" target="_blank" className="font-semibold text-primary hover:underline">Terms of Use</Link>
        {' '}and{' '}
        <Link href="/privacy" target="_blank" className="font-semibold text-primary hover:underline">Privacy Policy</Link>.
      </p>

      <p className="text-center text-xs text-grey-600">
        Already have an account?{' '}
        <Link href={withNext('/login', next) as Route} className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
