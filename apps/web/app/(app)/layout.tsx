import AuthGuard from '@/components/auth/AuthGuard';
import Navbar from '@/components/ui/Navbar';
import Sidebar from '@/components/ui/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="flex pt-16">
          <Sidebar className="hidden md:flex" />
          <main className="flex-1 p-4 md:p-8 md:pl-64">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
