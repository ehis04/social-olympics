/*
 * This file defines the DeleteAccountSection user-interface component.
 */

// DeleteAccountSection — permanently delete the signed-in user's account
'use client';

import { useState, type FormEvent } from 'react';
import { useAuthStore } from '@/stores/auth';

// Renders the delete account section component.
export function DeleteAccountSection() {
  const { clearAuth } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    if (confirmText !== 'DELETE') return;
    setIsDeleting(true);
    setError(null);
    const response = await fetch('/api/profile', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: 'DELETE' }),
    });
    if (!response.ok) {
      const json = (await response.json().catch(() => ({}))) as { error?: string };
      setError(json.error ?? 'Your account could not be deleted. Please try again.');
      setIsDeleting(false);
      return;
    }
    // The login no longer exists, so clear the session cookies and reload into the sign-in page,
    // which also discards everything cached in this tab.
    await fetch('/api/auth/signout', { method: 'POST' }).catch(() => null);
    clearAuth();
    window.location.assign(`/login?message=${encodeURIComponent('Your account has been deleted.')}`);
  }

  return (
    <section className="rounded-lg border border-red-200 bg-white p-6">
      <h2 className="text-base font-semibold text-red-700">Delete account</h2>
      <p className="mt-1 text-sm text-grey-600">
        This permanently removes your login, profile details, photos, messages, comments, follows and personal bests.
        Your name is replaced with &ldquo;Deleted user&rdquo; on past results so other people&apos;s standings stay correct.
        Competitions you host that haven&apos;t finished are handed to your co-host or another competitor. This cannot be undone.
      </p>

      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="mt-4 rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
        >
          Delete my account
        </button>
      ) : (
        <form onSubmit={handleDelete} className="mt-4 space-y-3">
          <label htmlFor="delete-confirm" className="block text-sm font-medium text-grey-700">
            Type DELETE to confirm
          </label>
          <input
            id="delete-confirm"
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            className="w-full rounded-lg border border-grey-300 px-3.5 py-2.5 text-sm text-grey-900 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                setConfirmText('');
                setError(null);
              }}
              className="rounded-lg border border-grey-200 px-4 py-2 text-sm font-semibold text-grey-600 hover:bg-grey-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirmText !== 'DELETE' || isDeleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting…' : 'Permanently delete account'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
