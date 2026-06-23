import Link from 'next/link';
import Image from 'next/image';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center justify-between border-b border-grey-200 bg-white px-8">
        <Link href="/">
          <Image
            src="/images/logo.svg"
            alt="Social Olympics"
            width={160}
            height={36}
            style={{ height: 'auto' }}
          />
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-grey-600 hover:text-primary">
            Sign in
          </Link>
          <Link
            href="/register"
            className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Register
          </Link>
        </div>
      </header>

      <main className="flex-1 px-8 py-12">{children}</main>

      <footer className="border-t border-grey-200 bg-white px-8 py-6 text-sm text-grey-400">
        <div className="flex items-center justify-between">
          <p>© {new Date().getFullYear()} Social Olympics. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-primary">
              Terms & Privacy
            </Link>
            <Link href="/about" className="hover:text-primary">
              About
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
