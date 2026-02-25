'use client';

import AtlasLogo from './AtlasLogo';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'PRODUCT',
      items: [
        { label: 'Features', href: '/product' },
        { label: 'How it Works', href: '/how-it-works' },
        { label: 'Start Chatting', href: '/conversation' },
      ],
    },
    {
      title: 'COMPANY',
      items: [
        { label: 'About Us', href: '/about' },
        { label: 'Contact', href: '/contact' },
        { label: 'Blog', href: '#' },
      ],
    },
    {
      title: 'LEGAL',
      items: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Disclaimer', href: '/disclaimer' },
      ],
    },
    {
      title: 'RESOURCES',
      items: [
        { label: 'Documentation', href: '#' },
        { label: 'FAQ', href: '#' },
        { label: 'Support', href: '/contact' },
      ],
    },
  ];

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="container py-20">
        {/* Main Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-12 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <AtlasLogo size={28} />
              <span className="font-bold text-xl text-slate-900 dark:text-white">Atlas</span>
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-xs">
              Your financial intelligence companion. Education, not advice.
            </p>
            <button
              onClick={() => window.location.href = '/conversation'}
              className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-200 text-sm w-full"
            >
              Get Started
            </button>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title} className="col-span-1">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-6 text-xs uppercase tracking-wider">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => window.location.href = item.href}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors duration-200 font-medium"
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-slate-900 dark:text-white">© {currentYear} Atlas Financial</p>
            <p>All rights reserved.</p>
          </div>
          <p className="max-w-md text-right md:text-left">
            Atlas provides financial education, not personalized investment or tax advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
