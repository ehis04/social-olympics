/*
 * This file defines the BlockButton user-interface component.
 */

// BlockButton — block or unblock another profile
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/lib/toast';

interface Props {
  profileId: string;
  displayName: string;
  initialBlocked: boolean;
}

// Renders the block button component. Blocking hides the person's messages and comments
// and stops direct messages in both directions.
export function BlockButton({ profileId, displayName, initialBlocked }: Props) {
  const router = useRouter();
  const [isBlocked, setIsBlocked] = useState(initialBlocked);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function update(block: boolean) {
    setIsConfirming(false);
    setIsSaving(true);
    const response = await fetch(`/api/users/${profileId}/block`, { method: block ? 'POST' : 'DELETE' });
    setIsSaving(false);
    const json = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      toast.error(json.error ?? 'Something went wrong. Please try again.');
      return;
    }
    setIsBlocked(block);
    toast.success(block ? `${displayName} is blocked` : `${displayName} is unblocked`);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (isBlocked ? void update(false) : setIsConfirming(true))}
        disabled={isSaving}
        className="rounded-lg border border-grey-200 px-3 py-1.5 text-sm font-medium text-grey-700 hover:bg-grey-50 disabled:opacity-60"
      >
        {isSaving ? 'Saving...' : isBlocked ? 'Unblock' : 'Block'}
      </button>
      <ConfirmDialog
        isOpen={isConfirming}
        title={`Block ${displayName}?`}
        message="You won't see their chat messages or comments, and neither of you can send the other a direct message. They won't be told. You can unblock them at any time."
        confirmLabel="Block"
        isDanger
        onConfirm={() => void update(true)}
        onCancel={() => setIsConfirming(false)}
      />
    </>
  );
}
