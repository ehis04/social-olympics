// Messages page — DM conversation inbox
import { redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { ConversationList } from '@/components/chat/ConversationList';
import ROUTES from '@/constants/routes';
import type { Route } from 'next';

export default async function MessagesPage() {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold text-grey-900">Messages</h1>
      <ConversationList />
    </div>
  );
}
