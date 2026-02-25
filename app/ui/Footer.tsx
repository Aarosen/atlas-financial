'use client';

import AtlasLogo from './AtlasLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Product',
      items: [
        { label: 'Features', href: '/product' },
        { label: 'How it Works', href: '/how-it-works' },
        { label: 'Start Chatting', href: '/conversation' },
      ],
    },
    {
      title: 'Company',
      items: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Blog', href: '#' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Disclaimer', href: '/disclaimer' },
      ],
    },
  ];

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-20">
      <div className="container py-16">
        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand Column */}
          <div className="lg:col-span-1">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 mb-4 hover:opacity-70 transition-opacity"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <AtlasLogo size={24} />
              <span className="font-bold text-lg text-slate-900 dark:text-white">Atlas</span>
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
              Your financial intelligence companion. Education, not advice.
            </p>
            <button
              onClick={() => window.location.href = '/conversation'}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm"
            >
              Get Started
            </button>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6 text-sm">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => window.location.href = item.href}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-8" />

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <p>© {currentYear} Atlas Financial. All rights reserved.</p>
          <p>Atlas provides financial education, not personalized investment or tax advice.</p>
        </div>
      </div>
    </footer>
  );
}
