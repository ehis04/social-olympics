/*
 * This file renders the join application page.
 */

// /join — entry point for invite links; redirects to the join page preserving the code
import { redirect } from 'next/navigation';

interface Props {
  searchParams: Promise<{ code?: string }>;
}

// Renders the join redirect page component.
export default async function JoinRedirectPage({ searchParams }: Props) {
  const { code } = await searchParams;
  if (code) {
    redirect(`/competitions/join?code=${encodeURIComponent(code)}`);
  }
  redirect('/competitions/join');
}
