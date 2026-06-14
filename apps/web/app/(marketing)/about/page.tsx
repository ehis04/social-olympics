import Link from 'next/link';

export const metadata = { title: 'About — Social Olympics' };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-grey-800">About Social Olympics</h1>
      <p className="mb-4 text-sm text-grey-600">
        Social Olympics is a platform that lets any group of people create and compete in their own
        custom Olympic-style competitions. Whether it&apos;s a weekend with friends, a company team
        day, or an ongoing league — you set the events, we handle the scoring.
      </p>
      <p className="mb-4 text-sm text-grey-600">
        Choose from a library of sports including track, swimming, field events, football,
        basketball, tennis, weightlifting, cycling, golf, and more. Create custom events for
        anything else. Assign weightings, form teams, and watch a live leaderboard update as
        results come in.
      </p>
      <p className="mb-8 text-sm text-grey-600">
        Social Olympics is free to use. No subscriptions, no ads.
      </p>
      <Link
        href="/register"
        className="rounded bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
      >
        Create your account
      </Link>
    </div>
  );
}
