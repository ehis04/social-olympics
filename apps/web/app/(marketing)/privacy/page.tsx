/*
 * This file renders the privacy policy page.
 */

import Link from 'next/link';
import { ContactEmail, LegalPage, LegalSection } from '@/components/legal/LegalPage';

export const metadata = { title: 'Privacy Policy: Social Olympics' };

// Renders the privacy policy page component.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        This policy explains what information Social Olympics collects when you use the website or the mobile app,
        why we collect it, who can see it, and the choices you have. We only collect what is needed to run
        competitions between you and the people you invite.
      </p>

      <LegalSection title="1. Information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account details:</strong> your email address, password (stored only as a secure hash), display name,
            date of birth (used to confirm you are old enough to join) and, if you choose, your country.
          </li>
          <li>
            <strong>Profile details you add:</strong> profile photo, bio, city and favourite sport.
          </li>
          <li>
            <strong>Competition activity:</strong> competitions you create or join, results you submit or record,
            evidence photos and links, confirmations, disputes, votes, team ratings and awards.
          </li>
          <li>
            <strong>Social activity:</strong> chat and direct messages, feed comments and reactions, people you follow,
            people you block, and reports you make.
          </li>
          <li>
            <strong>Device information:</strong> if you allow notifications in the mobile app, a push token that lets us
            send alerts to your device.
          </li>
          <li>
            <strong>Technical information:</strong> sign-in session cookies and your IP address, used to keep you signed in
            and to protect the service from abuse.
          </li>
        </ul>
        <p>We do not use advertising, tracking cookies or third-party analytics, and we never sell your information.</p>
      </LegalSection>

      <LegalSection title="2. How we use it">
        <ul className="list-disc space-y-2 pl-5">
          <li>To create your account and let you sign in (necessary to provide the service).</li>
          <li>To run competitions: scoring, leaderboards, podiums, personal bests and history (necessary to provide the service).</li>
          <li>To send in-app, email and push notifications about your competitions. You can turn off push notifications in your device settings at any time.</li>
          <li>To keep the community safe: reviewing reports, enforcing these rules, blocking abusive content and limiting repeated requests (our legitimate interest in a safe service).</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Who can see your information">
        <ul className="list-disc space-y-2 pl-5">
          <li>Your display name, photo, bio, country, city, favourite sport, career stats and personal bests are visible to other signed-in users.</li>
          <li>Results, chat, feed posts and comments in a competition are visible to that competition&apos;s members. Public competitions can be found by anyone signed in.</li>
          <li>Direct messages are visible only to you and the person you are messaging.</li>
          <li>Your email address and date of birth are never shown to other users.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Service providers">
        <p>We use a small number of providers who process information only on our instructions:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li><strong>Supabase</strong>: database, sign-in and file storage, hosted in the European Union (Frankfurt).</li>
          <li><strong>Cloudflare</strong>: hosting and delivery of the website.</li>
          <li><strong>Upstash</strong>: short-lived records of IP addresses used to limit repeated requests.</li>
          <li><strong>Expo</strong>: delivery of push notifications to the mobile app.</li>
          <li><strong>Our email provider</strong>: sending sign-up confirmation and password reset emails.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. How long we keep it">
        <p>
          We keep your information while your account is open. You can delete your account at any time from{' '}
          <strong>Profile settings → Delete account</strong>, in the website or the app. Deleting your account permanently
          removes your login, email address, profile details, photos, messages, comments, reactions, follows, blocks,
          notifications and personal bests. So that other people&apos;s results and standings stay correct, your past
          results remain in finished competitions under the name &ldquo;Deleted user&rdquo;. Backups held by our
          providers are overwritten within their normal retention period.
        </p>
      </LegalSection>

      <LegalSection title="6. Your rights">
        <p>
          Depending on where you live, you can ask to access, correct, delete or receive a copy of your information, and
          object to or restrict how we use it. Most details can be changed directly in Profile settings. For anything
          else, email <ContactEmail />. You also have the right to complain to your local data protection authority.
        </p>
      </LegalSection>

      <LegalSection title="7. Age">
        <p>Social Olympics is for people aged 16 and over. We do not knowingly collect information from anyone younger.</p>
      </LegalSection>

      <LegalSection title="8. Changes and contact">
        <p>
          If we make significant changes to this policy we will let you know in the app. Questions about privacy can be
          sent to <ContactEmail />. See also our <Link href="/terms" className="font-medium text-primary hover:underline">Terms of Use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
