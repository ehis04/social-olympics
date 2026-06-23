import Image from 'next/image';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-grey-100 px-4 py-12">
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/images/logo.svg"
            alt="Social Olympics"
            width={180}
            height={40}
            priority
            style={{ height: 'auto' }}
          />
        </Link>
      </div>
      <div className="w-full max-w-[400px] rounded-lg bg-white p-10 shadow-md">
        {children}
      </div>
    </div>
  );
}
