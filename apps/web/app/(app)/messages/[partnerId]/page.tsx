// DM thread page — direct message conversation with a specific partner
import { redirect, notFound } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { createAdminClient, getProfile } from '@repo/supabase';
import { DMThread } from '@/components/chat/DMThread';
import ROUTES from '@/constants/routes';
import type { Database } from '@repo/types';
import type { Route } from 'next';
import type { ProfileSnippet } from '@/types/social';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface Props {
  params: Promise<{ partnerId: string }>;
}

export default async function DMThreadPage({ params }: Props) {
  const client = await getServerClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(ROUTES.LOGIN as Route);

  const { partnerId } = await params;
  if (partnerId === user.id) redirect(ROUTES.MESSAGES as Route);

  const adminClient = createAdminClient();
  const { data: partnerData } = await getProfile(adminClient, partnerId);
  if (!partnerData) notFound();

  const profile = partnerData as ProfileRow;
  const partner: ProfileSnippet = {
    id: profile.id,
    display_name: profile.display_name,
    avatar_url: profile.avatar_url ?? null,
  };

  return (
    <div className="mx-auto max-w-2xl">
      <DMThread partnerId={partnerId} partner={partner} />
    </div>
  );
}
