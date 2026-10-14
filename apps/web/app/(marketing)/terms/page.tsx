/*
 * This file renders the terms of use page.
 */

import Link from 'next/link';
import { ContactEmail, LegalPage, LegalSection } from '@/components/legal/LegalPage';

export const metadata = { title: 'Terms of Use: Social Olympics' };

// Renders the terms page component.
export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <p>
        These terms apply when you use Social Olympics on the web or in the mobile app. By creating an account you agree
        to them. Please also read our <Link href="/privacy" className="font-medium text-primary hover:underline">Privacy Policy</Link>.
      </p>

      <LegalSection title="1. Your account">
        <ul className="list-disc space-y-2 pl-5">
          <li>You must be at least 16 years old to use Social Olympics.</li>
          <li>Give accurate details when you sign up and keep your password private. You are responsible for activity on your account.</li>
          <li>You can delete your account at any time from Profile settings.</li>
        </ul>
      </LegalSection>

      <LegalSection title="2. Taking part safely">
        <p>
          Social Olympics helps groups organise and score their own sporting and social events. We do not organise,
          supervise or run any event. Physical activity carries a risk of injury: take part only in events you are fit
          and able to do, follow local rules and venue guidance, and look after each other. You take part in events at
          your own risk.
        </p>
      </LegalSection>

      <LegalSection title="3. Prize pots">
        <p>
          A competition can show a prize pot for information only. Social Olympics does not collect, hold or pay out money.
          Any arrangement about money is between the people involved, who are responsible for following any laws that apply
          to them.
        </p>
      </LegalSection>

      <LegalSection title="4. Acceptable use">
        <p>When you use Social Olympics, do not:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>harass, threaten, bully or impersonate anyone, or post hateful, sexual or violent content;</li>
          <li>post anything illegal, or anything you do not have the right to share;</li>
          <li>submit results you know are false, or misuse disputes, votes or reports;</li>
          <li>send spam, try to access accounts or data that are not yours, or disrupt the service.</li>
        </ul>
        <p>
          You can report content or profiles with the Report button and block anyone you don&apos;t want to hear from.
          We review reports and may remove content, close competitions, or suspend or close accounts that break these rules.
        </p>
      </LegalSection>

      <LegalSection title="5. Your content">
        <p>
          You keep ownership of the photos, messages, results and other content you add. You give us permission to store
          and display that content within Social Olympics so the service can work, for as long as it remains on the service.
          Results in finished competitions stay part of those competitions&apos; records after you leave or delete your
          account, shown under &ldquo;Deleted user&rdquo;.
        </p>
      </LegalSection>

      <LegalSection title="6. The service">
        <p>
          We work to keep Social Olympics available and accurate, but it is provided &ldquo;as is&rdquo; and we cannot
          promise it will always be uninterrupted or error free. We may change or improve features over time. To the extent
          the law allows, we are not liable for indirect losses or for events organised through the service. Nothing in
          these terms limits rights you have under consumer law that cannot be excluded.
        </p>
      </LegalSection>

      <LegalSection title="7. Changes and contact">
        <p>
          If we make significant changes to these terms we will let you know in the app. Questions can be sent to{' '}
          <ContactEmail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
