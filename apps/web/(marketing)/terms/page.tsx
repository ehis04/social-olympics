export const metadata = { title: 'Terms & Privacy — Social Olympics' };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-grey-800">Terms of Use & Privacy Policy</h1>

      <p className="mb-6 rounded border border-warning bg-yellow-50 px-4 py-3 text-sm text-warning">
        Full terms of use and privacy policy will be published prior to public launch.
      </p>

      <section className="mb-6">
        <h2 className="mb-3 text-xl font-semibold text-grey-800">Key facts</h2>
        <ul className="flex flex-col gap-2 text-sm text-grey-600">
          <li>
            <strong>Age restriction:</strong> You must be at least 16 years old to use Social
            Olympics.
          </li>
          <li>
            <strong>No payment processing:</strong> Social Olympics does not handle, hold, or
            transfer money. Prize pot displays are informational only.
          </li>
          <li>
            <strong>Data storage:</strong> Your data is stored securely on Supabase infrastructure.
            The platform is registered in Ireland and operated under GDPR.
          </li>
          <li>
            <strong>Your rights:</strong> You have the right to access, correct, and delete your
            personal data at any time. Contact us using the details below.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-grey-800">Contact</h2>
        <p className="text-sm text-grey-600">
          For privacy or data requests, contact:{' '}
          <span className="font-medium text-grey-800">privacy@socialolympics.app</span> (placeholder
          — to be updated before launch).
        </p>
      </section>
    </div>
  );
}
