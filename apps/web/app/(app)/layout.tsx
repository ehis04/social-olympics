/*
 * This file defines the (app) application layout.
 */

import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';
import MobileNavDrawer from '@/components/ui/MobileNavDrawer';

// Renders the app layout component.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex pt-16">
          <Sidebar className="hidden md:flex" />
          <MobileNavDrawer />
          <main className="flex-1 p-4 md:p-8 md:pl-64">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
