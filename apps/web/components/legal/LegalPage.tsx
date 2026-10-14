/*
 * This file defines the shared layout pieces for the legal pages.
 */

import { WEB_CONFIG } from '@/constants/config';

// Renders the legal page heading and body.
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-2xl text-sm leading-relaxed text-grey-600">
      <h1 className="mb-2 text-2xl font-bold text-grey-800">{title}</h1>
      <p className="mb-8 text-xs text-grey-400">Last updated {WEB_CONFIG.LEGAL_LAST_UPDATED}</p>
      <div className="space-y-8">{children}</div>
    </article>
  );
}

// Renders one numbered section of a legal page.
export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-grey-800">{title}</h2>
      {children}
    </section>
  );
}

// Renders the contact address as a mail link.
export function ContactEmail() {
  return (
    <a href={`mailto:${WEB_CONFIG.CONTACT_EMAIL}`} className="font-medium text-primary hover:underline">
      {WEB_CONFIG.CONTACT_EMAIL}
    </a>
  );
}
