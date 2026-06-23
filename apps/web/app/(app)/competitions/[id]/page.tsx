// Redirects /competitions/[id] to the feed tab
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CompetitionIndexPage({ params }: Props) {
  redirect(`/competitions/${(await params).id}/feed`);
}
