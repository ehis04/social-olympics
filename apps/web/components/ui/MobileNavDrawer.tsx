/*
 * This file defines the MobileNavDrawer user-interface component.
 */

'use client';

// MobileNavDrawer — slide-in navigation for small screens, opened from the navbar menu button
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/ui/Sidebar';
import { useUiStore } from '@/stores/ui';

// Renders the mobile navigation drawer component.
export default function MobileNavDrawer() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useUiStore();

  // Close the drawer after navigating to another page.
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  useEffect(() => {
    if (!sidebarOpen) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setSidebarOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [sidebarOpen, setSidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <div className="md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      <Sidebar onClose={() => setSidebarOpen(false)} />
    </div>
  );
}
