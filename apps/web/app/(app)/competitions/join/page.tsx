'use client';

// Join competition page — handles invite code input and auto-submit from invite links
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy } from 'lucide-react';
import ROUTES from '@/constants/routes';
import { toast } from '@/lib/toast';

export default function JoinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('code')?.toUpperCase() ?? '';
  const [code, setCode] = useState(initialCode);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (initialCode) {
      handleJoin(initialCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleJoin(inviteCode?: string) {
    const codeToUse = (inviteCode ?? code).toUpperCase().trim();
    if (!codeToUse || codeToUse.length !== 8) {
      toast.error('Please enter a valid 8-character invite code');
      return;
    }

    setIsJoining(true);
    try {
      const res = await fetch('/api/competitions/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: codeToUse }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? 'Failed to join competition');
        return;
      }

      toast.success('Joined competition!');
      router.replace(ROUTES.COMPETITION_FEED(json.data.competitionId));
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted">
          <Trophy size={32} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-grey-800">Join a Competition</h1>
        <p className="mt-2 text-sm text-grey-500">
          Enter the 8-character invite code shared by the competition host.
        </p>
      </div>

      <div className="rounded-lg border border-grey-200 bg-white p-6 shadow-sm">
        <label className="mb-1 block text-sm font-semibold text-grey-700">Invite code</label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().trim())}
          placeholder="e.g. ABCD1234"
          maxLength={8}
          className="mb-4 w-full rounded-lg border border-grey-200 px-4 py-3 text-center font-mono text-lg font-bold uppercase tracking-widest text-grey-800 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          type="button"
          onClick={() => handleJoin()}
          disabled={isJoining || code.length !== 8}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60 transition-colors"
        >
          {isJoining ? 'Joining…' : 'Join Competition'}
        </button>

        <div className="mt-4 text-center">
          <Link
            href={ROUTES.DISCOVER}
            className="text-sm text-grey-500 hover:text-grey-700 hover:underline"
          >
            Or browse public competitions →
          </Link>
        </div>
      </div>
    </div>
  );
}
