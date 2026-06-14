'use client';

// Horizontal scrollable tab bar; uses pathname to determine active tab
import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';

interface Tab {
  label: string;
  href: Route;
}

interface Props {
  tabs: Tab[];
}

export default function TabBar({ tabs }: Props) {
  const pathname = usePathname();

  return (
    <div className="mt-4 border-b border-grey-200">
      <nav className="-mb-px flex overflow-x-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + '/');
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap ${
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-grey-600 hover:border-grey-300 hover:text-grey-800'
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
