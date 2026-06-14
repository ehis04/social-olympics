'use client';

// Displays invite link and invite code with copy-to-clipboard buttons
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from '@/lib/toast';

interface Props {
  competitionId: string;
  inviteCode: string;
}

export default function InvitePanel({ competitionId, inviteCode }: Props) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/join?code=${inviteCode}`
      : `/join?code=${inviteCode}`;

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success('Invite link copied');
    setTimeout(() => setCopiedLink(false), 2000);
  }

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    toast.success('Invite code copied');
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-grey-400">Invite</p>

      <div className="mb-3">
        <p className="mb-1 text-xs font-semibold text-grey-600">Invite link</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded border border-grey-200 bg-white px-3 py-1.5 text-xs text-grey-700">
            {inviteLink}
          </code>
          <button
            onClick={copyLink}
            className="flex items-center gap-1 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-grey-600 hover:text-grey-800 transition-colors"
          >
            {copiedLink ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          </button>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-semibold text-grey-600">Invite code</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold tracking-widest text-grey-800">
            {inviteCode}
          </span>
          <button
            onClick={copyCode}
            className="flex items-center gap-1 rounded border border-grey-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-grey-600 hover:text-grey-800 transition-colors"
          >
            {copiedCode ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>
  );
}
