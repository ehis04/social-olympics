import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold text-grey-800">Page not found</h1>
      <p className="text-sm text-grey-600">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/dashboard"
        className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
