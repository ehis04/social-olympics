/*
 * This file renders the id application page.
 */

// Redirects /competitions/[id] to the feed tab
import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ id: string }>;
}

// Renders the competition index page component.
export default async function CompetitionIndexPage({ params }: Props) {
  redirect(`/competitions/${(await params).id}/feed`);
}
