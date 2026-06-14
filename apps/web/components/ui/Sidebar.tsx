'use client';

// Sidebar with main nav, active competition sub-nav, and user competitions list
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useParams } from 'next/navigation';
import { LayoutDashboard, Compass, MessageSquare, ChevronRight } from 'lucide-react';
import { useUserCompetitions } from '@/hooks/competition/useUserCompetitions';
import ROUTES from '@/constants/routes';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/competitions/discover', label: 'Discover', icon: Compass },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
] as const;

const COMPETITION_TABS = [
  { label: 'Feed', key: 'feed' },
  { label: 'Leaderboard', key: 'leaderboard' },
  { label: 'Events', key: 'events' },
  { label: 'Chat', key: 'chat' },
  { label: 'Members', key: 'members' },
  { label: 'Settings', key: 'settings' },
] as const;

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const params = useParams();
  const competitionId = params?.id as string | undefined;
  const isInsideCompetition = !!competitionId && pathname.includes('/competitions/');

  const { competitions } = useUserCompetitions();

  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-20 w-60 flex-col border-r border-grey-200 bg-white ${className ?? ''}`}
    >
      <nav className="flex flex-col gap-1 p-3">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-grey-600 hover:bg-primary-muted hover:text-primary'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <hr className="mx-3 border-grey-200" />

      {isInsideCompetition ? (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-grey-400">
            Competition
          </p>
          <nav className="flex flex-col gap-0.5">
            {COMPETITION_TABS.map(({ label, key }) => {
              const href = `/competitions/${competitionId}/${key}` as Route;
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={key}
                  href={href}
                  className={`flex items-center rounded px-3 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-primary text-white'
                      : 'text-grey-600 hover:bg-primary-muted hover:text-primary'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-grey-400">
            My Competitions
          </p>
          {competitions.length === 0 ? (
            <p className="px-3 text-xs text-grey-400">Join or create a competition to get started</p>
          ) : (
            <nav className="flex flex-col gap-0.5">
              {competitions.map((comp) => {
                const href = ROUTES.COMPETITION_FEED(comp.id);
                const active = pathname.startsWith(`/competitions/${comp.id}`);
                return (
                  <Link
                    key={comp.id}
                    href={href}
                    className={`flex items-center justify-between rounded px-3 py-2 text-sm font-semibold transition-colors ${
                      active
                        ? 'bg-primary text-white'
                        : 'text-grey-600 hover:bg-primary-muted hover:text-primary'
                    }`}
                  >
                    <span className="truncate">{comp.name}</span>
                    <ChevronRight size={14} className="shrink-0 opacity-60" />
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      )}
    </aside>
  );
}
