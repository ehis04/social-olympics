// Create competition page — fetches event library and renders the multi-step form
import { getServerClient } from '@/lib/supabase/server';
import CreateCompetitionForm from '@/components/competition/CreateCompetitionForm';
import { getEventsLibrary } from '@repo/supabase';
import type { Database } from '@repo/types';

export const metadata = { title: 'Create Competition: Social Olympics' };

type EventRow = Database['public']['Tables']['events']['Row'];
type EventWithCategory = EventRow & {
  event_categories?: { name: string; slug: string } | null;
};

export default async function CreateCompetitionPage() {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  const { data } = await getEventsLibrary(client);
  const events = (data ?? []) as EventWithCategory[];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-grey-800">Create Competition</h1>
      <CreateCompetitionForm events={events} currentUserId={user?.id ?? ''} />
    </div>
  );
}
