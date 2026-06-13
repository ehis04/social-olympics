'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Compass, MessageSquare } from 'lucide-react';

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/competitions/discover', label: 'Discover', icon: Compass },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
];

export default function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed bottom-0 left-0 top-16 z-20 w-60 flex-col border-r border-grey-200 bg-white ${className ?? ''}`}
    >
      <nav className="flex flex-col gap-1 p-3">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
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

      <div className="p-3">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-grey-400">
          My Competitions
        </p>
        {/* Populated in Phase 5 when competitions exist */}
        <p className="px-3 text-xs text-grey-400">
          Join or create a competition to get started
        </p>
      </div>
    </aside>
  );
}
