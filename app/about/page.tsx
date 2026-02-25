export const metadata = {
  title: 'About Atlas — Your Financial Intelligence Companion',
  description: 'Learn about Atlas, a privacy-first financial education AI companion.',
};

export default function AboutPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">About Atlas</h1>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
            Atlas is a financial intelligence companion designed to help you understand your money better. We believe financial education should be accessible, personalized, and free from conflicts of interest.
          </p>
          <p className="text-lg text-slate-700 dark:text-slate-300">
            Our mission is to empower people with the knowledge and tools they need to make confident financial decisions—without selling products or collecting unnecessary data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How Atlas Works</h2>
          <p className="text-lg text-slate-700 dark:text-slate-300 mb-4">
            Atlas uses advanced AI to have natural conversations about your financial situation. We listen, ask clarifying questions, and provide personalized guidance on budgeting, debt, savings, investing, and retirement planning.
          </p>
          <p className="text-lg text-slate-700 dark:text-slate-300">
            Every recommendation is grounded in financial principles and tailored to your unique circumstances. We focus on teaching you to fish, not handing you a fish.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Our Principles</h2>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <div>
                <h3 className="font-semibold">Privacy First</h3>
                <p className="text-slate-600 dark:text-slate-400">Your data is yours. We don't sell it, share it, or use it for marketing.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <div>
                <h3 className="font-semibold">Education, Not Advice</h3>
                <p className="text-slate-600 dark:text-slate-400">We teach financial concepts. We don't provide personalized investment or tax advice.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <div>
                <h3 className="font-semibold">No Conflicts of Interest</h3>
                <p className="text-slate-600 dark:text-slate-400">We don't earn commissions on products we recommend. We're here for you, not our bottom line.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <div>
                <h3 className="font-semibold">Transparent</h3>
                <p className="text-slate-600 dark:text-slate-400">We're open about our limitations and always encourage you to verify important information.</p>
              </div>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
          <p className="text-lg text-slate-700 dark:text-slate-300">
            Have questions or feedback? We'd love to hear from you.{' '}
            <a href="/contact" className="text-blue-600 hover:underline font-semibold">
              Get in touch
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
