'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Bell, ChevronDown, Menu, User } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useSignOut } from '@/hooks/auth/useSignOut';
import { useUnreadNotificationCount } from '@/hooks/notifications/useNotifications';

export default function Navbar({ className }: { className?: string }) {
  const { profile } = useAuthStore();
  const { toggleSidebar } = useUiStore();
  const { signOut } = useSignOut();
  const unreadNotifications = useUnreadNotificationCount();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-30 flex h-16 items-center border-b border-grey-200 bg-white px-4 ${className ?? ''}`}
    >
      <button
        onClick={toggleSidebar}
        className="mr-3 rounded p-1.5 text-grey-600 hover:bg-grey-100 md:hidden"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>

      <Link href="/dashboard" className="flex items-center gap-2">
        <Image
          src="/images/logo.svg"
          alt="Social Olympics"
          width={160}
          height={36}
          priority
          style={{ width: 'auto', height: 'auto' }}
        />
      </Link>

      <div className="flex-1" />

      {/* Notifications */}
      <Link
        href="/notifications"
        className="relative mr-2 rounded p-2 text-grey-600 hover:bg-grey-100"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadNotifications > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </Link>

      {/* User menu */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="flex items-center gap-2 rounded px-2 py-1.5 text-sm font-semibold text-grey-800 hover:bg-grey-100"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-muted">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <User size={16} className="text-primary" />
            )}
          </div>
          <span className="hidden sm:block">{profile?.display_name ?? 'Account'}</span>
          <ChevronDown size={14} className="text-grey-400" />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 rounded border border-grey-200 bg-white py-1 shadow-md">
            <Link
              href={`/profile/${profile?.id}`}
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-grey-800 hover:bg-grey-100"
            >
              My Profile
            </Link>
            <Link
              href="/profile/settings"
              onClick={() => setDropdownOpen(false)}
              className="block px-4 py-2 text-sm text-grey-800 hover:bg-grey-100"
            >
              Settings
            </Link>
            <hr className="my-1 border-grey-200" />
            <button
              onClick={signOut}
              className="w-full px-4 py-2 text-left text-sm text-grey-800 hover:bg-grey-100"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
