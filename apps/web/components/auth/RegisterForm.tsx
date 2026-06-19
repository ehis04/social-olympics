'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { createBrowserClient } from '@repo/supabase';
import { RegisterSchema, type RegisterInput } from '@repo/validations';
import { toast } from '@/lib/toast';

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

function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: 'bg-grey-200', width: 'w-0' };
  if (password.length < 6) return { label: 'Weak', color: 'bg-error', width: 'w-1/4' };
  if (password.length < 10) return { label: 'Fair', color: 'bg-warning', width: 'w-2/4' };
  if (/[A-Z]/.test(password) && /[0-9]/.test(password))
    return { label: 'Strong', color: 'bg-success', width: 'w-full' };
  return { label: 'Good', color: 'bg-primary', width: 'w-3/4' };
}

export default function RegisterForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

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
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
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

    toast.success('Account created! Welcome to Social Olympics.');
    router.push('/dashboard');
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

      <p className="text-center text-xs text-grey-600">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
