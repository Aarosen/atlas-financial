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
      <div className="container py-16">
        {/* Brand Section */}
        <div className="mb-12">
          <button
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2 mb-4 hover:opacity-70 transition-opacity duration-200 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <AtlasLogo size={28} />
            <span className="font-bold text-xl text-slate-900 dark:text-white">Atlas</span>
          </button>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm leading-relaxed">
            Your financial intelligence companion. Education, not advice.
          </p>
          <button
            onClick={() => window.location.href = '/conversation'}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-full transition-all duration-200 text-sm hover:shadow-lg hover:shadow-teal-500/30 hover:scale-102 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
          >
            Get Started
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 my-12" />

        {/* Footer Sections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-xs uppercase tracking-widest opacity-80">
                {section.title}
              </h3>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => window.location.href = item.href}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:text-teal-600 dark:active:text-teal-400 transition-all duration-150 hover:translate-x-0.5 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600 font-medium"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      • {item.label}
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
        <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
          © {currentYear} Atlas Financial
        </p>
      </div>
    </footer>
  );
}
