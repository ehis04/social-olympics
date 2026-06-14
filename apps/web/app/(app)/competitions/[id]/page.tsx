// Redirects /competitions/[id] to the feed tab
import { redirect } from 'next/navigation';

interface Props {
  params: { id: string };
}

export default function CompetitionIndexPage({ params }: Props) {
  redirect(`/competitions/${params.id}/feed`);
}
