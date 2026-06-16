// Competition feed page — activity feed for a competition
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition } from '@repo/supabase';
import { FeedView } from '@/components/feed/FeedView';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import type { Route } from 'next';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  params: { id: string };
}

export default async function FeedPage({ params }: Props) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const { data: compData } = await getCompetition(client, params.id);
  if (!compData) redirect(ROUTES.DASHBOARD as Route);

  return <FeedView competition={compData as CompetitionRow} />;
}
