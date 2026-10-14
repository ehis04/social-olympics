/*
 * This file defines the InvitePanel user-interface component.
 */

'use client';

// Displays invite link and invite code with copy and share buttons
import { Copy, Check, Share2 } from 'lucide-react';
import { useState, useSyncExternalStore } from 'react';
import { toast } from '@/lib/toast';

interface Props {
  inviteCode: string;
}

// The origin and share support never change while the page is open, so there is nothing to subscribe to.
const subscribeToNothing = () => () => {};

// Renders the invite panel component.
export default function InvitePanel({ inviteCode }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  // The full link needs the browser's origin, so the server renders a relative link first.
  const origin = useSyncExternalStore(subscribeToNothing, () => window.location.origin, () => '');
  const canShare = useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator.share === 'function',
    () => false,
  );

  const inviteLink = `${origin}/join?code=${inviteCode}`;

  async function copy(text: string, label: string, setCopied: (value: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(`Copying isn't available here. Select the ${label.toLowerCase()} and copy it manually.`);
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: 'Join my Social Olympics competition',
        text: `Join my competition on Social Olympics with code ${inviteCode}.`,
        url: inviteLink,
      });
    } catch {
      // Closing the share sheet is not an error.
    }
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-grey-400">Invite</p>
        {canShare && (
          <button
            type="button"
            onClick={() => void share()}
            className="flex items-center gap-1.5 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-grey-600 transition-colors hover:text-grey-800"
          >
            <Share2 size={12} />
            Share invite
          </button>
        )}
      </div>

      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold text-grey-600">Invite link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 select-all truncate rounded border border-grey-200 bg-white px-3 py-1.5 text-xs text-grey-700">
            {inviteLink}
          </code>
          <button
            type="button"
            onClick={() => void copy(inviteLink, 'Invite link', setCopiedLink)}
            aria-label="Copy invite link"
            className="flex items-center gap-1 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-grey-600 hover:text-grey-800 transition-colors"
          >
            {copiedLink ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-grey-600">Invite code</p>
        <div className="flex items-center gap-2">
          <span className="select-all font-mono text-lg font-bold tracking-widest text-grey-800">
            {inviteCode}
          </span>
          <button
            type="button"
            onClick={() => void copy(inviteCode, 'Invite code', setCopiedCode)}
            aria-label="Copy invite code"
            className="flex items-center gap-1 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-grey-600 hover:text-grey-800 transition-colors"
          >
            {copiedCode ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
