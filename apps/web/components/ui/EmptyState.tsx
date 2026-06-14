// Reusable empty state with optional CTA; used throughout the app for empty lists
import Link from 'next/link';
import type { Route } from 'next';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  heading: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: Route;
  onCtaClick?: () => void;
}

export default function EmptyState({ icon: Icon = Inbox, heading, description, ctaLabel, ctaHref, onCtaClick }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-grey-200 bg-grey-50 px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-grey-100">
        <Icon size={26} className="text-grey-400" />
      </div>
      <h3 className="mb-1 text-base font-semibold text-grey-800">{heading}</h3>
      <p className="mb-6 max-w-xs text-sm text-grey-500">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="rounded bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
      {ctaLabel && onCtaClick && !ctaHref && (
        <button
          onClick={onCtaClick}
          className="rounded bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          {ctaLabel}
        </button>
      )}
    </div>
  );
}
