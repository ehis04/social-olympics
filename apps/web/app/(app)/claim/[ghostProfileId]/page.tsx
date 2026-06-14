// Claim page — lets a real user claim a ghost profile and inherit its history
import { redirect, notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import ClaimProfileButton from '@/components/competition/ClaimProfileButton';
import type { Database } from '@repo/types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface Props {
  params: { ghostProfileId: string };
}

export default async function ClaimPage({ params }: Props) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', params.ghostProfileId)
    .eq('is_ghost', true)
    .is('claimed_by', null)
    .single();

  if (error || !data) redirect('/dashboard');
  const ghost = data as Profile;

  const { data: memberData } = await client
    .from('competition_members')
    .select('competition_id, competitions(name)')
    .eq('profile_id', ghost.id)
    .limit(1)
    .single();

  const competitionName =
    (memberData?.competitions as { name: string } | null)?.name ?? 'a competition';

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-lg border border-grey-200 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-muted text-2xl font-bold text-primary">
          {ghost.display_name.charAt(0).toUpperCase()}
        </div>

        <h1 className="mb-1 text-xl font-bold text-grey-800">
          You&apos;ve been invited to join Social Olympics
        </h1>
        <p className="mb-4 text-sm text-grey-500">
          A guest profile was created for{' '}
          <span className="font-semibold text-grey-700">{ghost.display_name}</span> in{' '}
          <span className="font-semibold text-grey-700">{competitionName}</span>.
        </p>

        <div className="mb-6 rounded-lg bg-grey-50 px-4 py-3 text-sm text-grey-600">
          <p>
            Claiming will transfer all results, medals, and competition history to your account.
          </p>
        </div>

        <ClaimProfileButton ghostProfileId={params.ghostProfileId} />

        <p className="mt-3 text-xs text-grey-400">
          Or{' '}
          <a href="/dashboard" className="underline hover:text-grey-600">
            continue without claiming
          </a>
        </p>
      </div>
    </div>
  );
}
