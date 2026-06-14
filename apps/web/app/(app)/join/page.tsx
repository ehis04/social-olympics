// /join — entry point for invite links; redirects to the join page preserving the code
import { redirect } from 'next/navigation';

interface Props {
  searchParams: { code?: string };
}

export default function JoinRedirectPage({ searchParams }: Props) {
  const code = searchParams.code;
  if (code) {
    redirect(`/competitions/join?code=${encodeURIComponent(code)}`);
  }
  redirect('/competitions/join');
}
