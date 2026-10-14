/*
 * This file defines the Sidebar user-interface component.
 */

'use client';

// Sidebar with main nav, active competition sub-nav, and user competitions list
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname, useParams } from 'next/navigation';
import { Bell, LayoutDashboard, Compass, MessageSquare, ChevronRight, Users, Ticket, X } from 'lucide-react';
import { useUserCompetitions } from '@/hooks/competition/useUserCompetitions';
import { useUnreadNotificationCount } from '@/hooks/notifications/useNotifications';
import ROUTES from '@/constants/routes';
import { useAuth } from '@/hooks/auth/useAuth';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/competitions/discover', label: 'Discover', icon: Compass },
  { href: '/competitions/join', label: 'Join with code', icon: Ticket },
  { href: '/profile/search', label: 'People', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
] as const;

const COMPETITION_TABS = [
  { label: 'Feed', key: 'feed' },
  { label: 'Leaderboard', key: 'leaderboard' },
  { label: 'Events', key: 'events' },
  { label: 'Chat', key: 'chat' },
  { label: 'Members', key: 'members' },
  { label: 'Podium', key: 'podium' },
  { label: 'Settings', key: 'settings' },
] as const;

// Renders the sidebar component.
export default function Sidebar({ className, onClose }: { className?: string; onClose?: () => void }) {
  const pathname = usePathname();
  const params = useParams();
  const competitionId = params?.id as string | undefined;
  const isInsideCompetition = !!competitionId && pathname.includes('/competitions/');

  const { competitions } = useUserCompetitions();
  const { user } = useAuth();
  const unreadNotifications = useUnreadNotificationCount();
  const currentCompetition = competitions.find((comp) => comp.id === competitionId);
  const canManage = !!currentCompetition && !!user &&
    (currentCompetition.host_id === user.id || currentCompetition.cohost_id === user.id);
  const isFinished = currentCompetition?.status === 'complete' || currentCompetition?.status === 'archived';
  const competitionTabs = COMPETITION_TABS.filter((tab) =>
    (tab.key !== 'settings' || canManage) && (tab.key !== 'podium' || isFinished),
  );

  return (
    <aside
      className={`fixed bottom-0 left-0 ${onClose ? 'top-0 z-50 flex shadow-xl' : 'top-16 z-20'} w-60 flex-col overflow-y-auto border-r border-grey-200 bg-white ${className ?? ''}`}
    >
      {onClose && (
        <div className="flex items-center justify-between px-4 pt-3">
          <span className="text-sm font-semibold text-grey-500">Menu</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="rounded p-1 text-grey-500 hover:bg-grey-100"
          >
            <X size={18} />
          </button>
        </div>
      )}
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
              {href === '/notifications' && unreadNotifications > 0 && (
                <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
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
            {competitionTabs.map(({ label, key }) => {
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
