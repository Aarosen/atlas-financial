'use client';

export default function TermsPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Terms & Conditions</h1>

        <div className="prose dark:prose-invert max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              By accessing and using Atlas, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">2. Educational Purpose Only</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Atlas provides financial education and general information only. We do not provide personalized investment advice, tax advice, or financial planning services. Nothing on Atlas should be construed as professional financial, investment, tax, or legal advice.
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              Always consult with qualified professionals before making important financial decisions.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">3. No Warranty</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              Atlas is provided on an "as is" basis without warranties of any kind, express or implied. We do not warrant that the service will be uninterrupted, error-free, or that any defects will be corrected.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">4. Limitation of Liability</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              In no event shall Atlas be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the service, even if we have been advised of the possibility of such damages.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">5. User Responsibilities</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              You agree to use Atlas only for lawful purposes and in a way that does not infringe upon the rights of others or restrict their use and enjoyment of Atlas. Prohibited behavior includes:
            </p>
            <ul className="list-disc list-inside text-slate-700 dark:text-slate-300 space-y-2">
              <li>Harassing or causing distress or inconvenience to any person</li>
              <li>Obscene or offensive language or content</li>
              <li>Disrupting the normal flow of dialogue within Atlas</li>
              <li>Attempting to gain unauthorized access to systems</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              All content, features, and functionality of Atlas are owned by Atlas, its licensors, or other providers of such material and are protected by copyright, trademark, and other intellectual property laws.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">7. Changes to Terms</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              We reserve the right to modify these terms at any time. Your continued use of Atlas following the posting of revised terms means that you accept and agree to the changes.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">8. Governing Law</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              These terms and conditions are governed by and construed in accordance with the laws of the United States, and you irrevocably submit to the exclusive jurisdiction of the courts located in that location.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Contact</h2>
            <p className="text-slate-700 dark:text-slate-300">
              If you have any questions about these Terms & Conditions, please{' '}
              <a href="/contact" className="text-blue-600 hover:underline font-semibold">
                contact us
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
