// ResetPasswordForm — completes the email recovery flow, then signs the temporary session out
'use client';

import { useState, type FormEvent } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@repo/supabase';
import { toast } from '@/lib/toast';

function validatePassword(password: string, confirmPassword: string): string | null {
  if (password.length < 6) return 'Password must be at least 6 characters';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationError = validatePassword(password, confirmPassword);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setIsSubmitting(true);
    const supabase = createBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    setIsSubmitting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await supabase.auth.signOut();
    toast.success('Password updated. Please sign in with your new password.');
    router.replace('/login');
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="new-password" className="block text-sm font-medium text-grey-700">
          New password
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 pr-10 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-grey-400 hover:text-grey-600"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="block text-sm font-medium text-grey-700">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type={showPassword ? 'text' : 'password'}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 placeholder:text-grey-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-2 w-full rounded bg-primary py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-60"
      >
        {isSubmitting ? 'Updating…' : 'Update password'}
      </button>
    </form>
  );
}
