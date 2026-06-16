// DM thread page — direct message conversation with a specific partner
import { redirect, notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getProfile } from '@repo/supabase';
import { DMThread } from '@/components/chat/DMThread';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import type { Route } from 'next';
import type { ProfileSnippet } from '@/types/social';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface Props {
  params: { partnerId: string };
}

export default async function DMThreadPage({ params }: Props) {
  const client = getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  if (params.partnerId === user.id) redirect(ROUTES.MESSAGES as Route);

  const { data: partnerData } = await getProfile(client, params.partnerId);
  if (!partnerData) notFound();

  const profile = partnerData as ProfileRow;
  const partner: ProfileSnippet = {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url ?? null,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <DMThread partnerId={params.partnerId} partner={partner} />
    </div>
  );
}
