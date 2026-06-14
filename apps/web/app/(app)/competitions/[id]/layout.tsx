// Competition detail layout — fetches competition and membership, renders header + tabs
import { notFound, redirect } from 'next/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getCompetition, getCompetitionMembers } from '@repo/supabase';
import CompetitionHeader from '@/components/competition/CompetitionHeader';
import TabBar from '@/components/ui/TabBar';
import ROUTES from '@/constants/routes';
import { toast } from '@/lib/toast';
import type { Database } from '@repo/types';

type CompetitionRow = Database['public']['Tables']['competitions']['Row'];
type MemberRow = Database['public']['Tables']['competition_members']['Row'] & {
  profile: Database['public']['Tables']['profiles']['Row'] | null;
};

interface Props {
  children: React.ReactNode;
  params: { id: string };
}

export default async function CompetitionDetailLayout({ children, params }: Props) {
  const client = getServerClient();
  const {
    data: { user },
  } = await client.auth.getUser();

  const { data: compData, error } = await getCompetition(client, params.id);
  if (error || !compData) return notFound();
  const competition = compData as CompetitionRow;

  const { data: membersData } = await getCompetitionMembers(client, params.id);
  const members = (membersData ?? []) as MemberRow[];

  const currentMember = members.find((m) => m.profile_id === user!.id) ?? null;

  if (!competition.is_public && !currentMember) {
    redirect(ROUTES.DASHBOARD);
  }

  const isHost = competition.host_id === user!.id;
  const isCohost = competition.cohost_id === user!.id;

  const tabs = [
    { label: 'Feed', href: ROUTES.COMPETITION_FEED(params.id) },
    { label: 'Leaderboard', href: ROUTES.COMPETITION_LEADERBOARD(params.id) },
    { label: 'Events', href: ROUTES.COMPETITION_EVENTS(params.id) },
    { label: 'Chat', href: ROUTES.COMPETITION_CHAT(params.id) },
    { label: 'Members', href: ROUTES.COMPETITION_MEMBERS(params.id) },
    ...(isHost || isCohost
      ? [{ label: 'Settings', href: ROUTES.COMPETITION_SETTINGS(params.id) }]
      : []),
  ];

  return (
    <div>
      <CompetitionHeader
        competition={competition}
        currentMember={currentMember}
        memberCount={members.length}
      />
      <TabBar tabs={tabs} />
      <div className="mt-6">{children}</div>
    </div>
  );
}
