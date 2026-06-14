// Members page — fetches members with profiles and renders the members list
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import MembersList from '@/components/competition/MembersList';
import { notFound } from 'next/navigation';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberWithProfile = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

interface Props {
  params: { id: string };
}

export default async function MembersPage({ params }: Props) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const { data: compData } = await getCompetition(client, params.id);
  if (!compData) return notFound();
  const competition = compData as CompetitionRow;

  const { data: membersData } = await getCompetitionMembers(client, params.id);
  const members = (membersData ?? []) as MemberWithProfile[];

  const currentMember = members.find((m) => m.profile_id === user!.id) ?? null;
  const isHost = competition.host_id === user!.id;
  const isCohost = competition.cohost_id === user!.id;

  return (
    <MembersList
      members={members}
      competitionId={params.id}
      inviteCode={competition.invite_code ?? ''}
      currentMemberId={currentMember?.id ?? null}
      isHost={isHost}
      isCohost={isCohost}
      competitionStatus={competition.status}
    />
  );
}
