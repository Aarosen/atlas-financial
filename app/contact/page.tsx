export const metadata = {
  title: 'Contact Us — Atlas',
  description: 'Get in touch with the Atlas team.',
};

export default function ContactPage() {
  return (
    <div className="container py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Contact Us</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-slate-700 dark:text-slate-300 mb-6">
              Have questions, feedback, or just want to say hello? We'd love to hear from you. Fill out the form and we'll get back to you as soon as possible.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Email</h3>
                <a href="mailto:hello@atlas.financial" className="text-blue-600 hover:underline">
                  hello@atlas.financial
                </a>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">GitHub</h3>
                <a href="https://github.com/Aarosen/atlas-financial" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  github.com/Aarosen/atlas-financial
                </a>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Response Time</h3>
                <p className="text-slate-700 dark:text-slate-300">
                  We typically respond to inquiries within 24-48 hours.
                </p>
              </div>
            </div>
          </div>

          <div>
            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-6">
              <h2 className="text-2xl font-semibold mb-4">Contact Form</h2>
              <form className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Message
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    rows={5}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
