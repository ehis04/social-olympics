// Competition chat page — group chat for a competition
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition } from '@repo/supabase';
import { GroupChatView } from '@/components/chat/GroupChatView';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import type { Route } from 'next';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const { data: compData } = await getCompetition(client, (await params).id);
  if (!compData) redirect(ROUTES.DASHBOARD as Route);

  return <GroupChatView competition={compData as CompetitionRow} />;
}
