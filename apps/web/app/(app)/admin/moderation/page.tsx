// Admin moderation queue — lists pending reports with resolve actions
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getReports } from '@repo/supabase';
import { ModerationQueue } from '@/components/moderation/ModerationQueue';
import type { Report } from '@/components/moderation/ModerationQueue';
import type { Route } from 'next';

export const metadata = { title: 'Moderation Queue — Admin' };

const ADMIN_PROFILE_IDS = (process.env.ADMIN_PROFILE_IDS ?? '').split(',').filter(Boolean);

export default async function ModerationPage() {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect('/login' as Route);

  if (!ADMIN_PROFILE_IDS.includes(user.id)) {
    redirect('/dashboard' as Route);
  }

  const adminClient = createAdminClient();
  const { data: pendingData } = await getReports(adminClient, 'pending', { limit: 20 });
  const { data: actionedData } = await getReports(adminClient, 'actioned', { limit: 20 });

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div>
        <h1 className="text-2xl font-bold text-grey-900">Moderation Queue</h1>
        <p className="mt-1 text-sm text-grey-500">Review and action flagged content</p>
      </div>

      <ModerationQueue
        initialPending={(pendingData ?? []) as unknown as Report[]}
        initialActioned={(actionedData ?? []) as unknown as Report[]}
      />
    </div>
  );
}
