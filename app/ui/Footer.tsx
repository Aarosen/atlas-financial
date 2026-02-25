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
      title: 'Legal',
      items: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms & Conditions', href: '/terms' },
        { label: 'Disclaimer', href: '/disclaimer' },
      ],
    },
    {
      title: 'Company',
      items: [
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
  ];

  return (
    <footer className="bg-gradient-to-br from-slate-900 to-slate-800 text-white mt-16">
      <div className="container py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-12">
          {/* Brand Section */}
          <div className="lg:col-span-1">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <AtlasLogo size={24} />
              <span className="font-bold text-lg">Atlas</span>
            </button>
            <p className="text-sm text-slate-300">
              Your financial intelligence companion. Education, not advice.
            </p>
          </div>

          {/* Footer Sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">{section.title}</h3>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => window.location.href = item.href}
                    className="w-full text-left text-sm text-slate-300 hover:text-white transition-colors duration-200 font-medium hover:translate-x-1 transform px-0 py-0"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* CTA Section */}
          <div className="lg:col-span-1">
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider">Get Started</h3>
            <button
              onClick={() => window.location.href = '/conversation'}
              className="w-full px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
            >
              Start Now
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-700 pt-8">
          {/* Bottom Section */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-400">
            <p>© {currentYear} Atlas Financial. All rights reserved.</p>
            <p className="text-xs">Atlas provides financial education, not personalized investment or tax advice.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
