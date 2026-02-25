'use client';

import { Lock, Mail, Linkedin, Twitter } from 'lucide-react';
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
      title: 'RESOURCES',
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
      title: 'SUPPORT',
      items: [
        { label: 'FAQ', href: '#' },
        { label: 'Get Support', href: '/contact' },
        { label: 'Documentation', href: '#' },
      ],
    },
  ];

  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
      <div className="container py-20">
        {/* Brand & Trust Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-16">
          {/* Brand Column */}
          <div>
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 mb-6 hover:opacity-70 transition-opacity duration-200 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              aria-label="Atlas home"
            >
              <AtlasLogo size={28} />
              <span className="font-bold text-xl text-slate-900 dark:text-white">Atlas</span>
            </button>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-8 max-w-sm leading-relaxed">
              Your financial intelligence companion. Education, not advice.
            </p>
            <button
              onClick={() => window.location.href = '/conversation'}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-full transition-all duration-200 text-sm hover:shadow-lg hover:shadow-teal-500/30 hover:scale-102 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
            >
              Get Started
            </button>
          </div>

          {/* Trust & Security Section */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-8 border border-slate-200 dark:border-slate-800">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <Lock size={24} className="text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Your data is secure</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Your financial information is encrypted and stored securely. Atlas prioritizes your privacy and confidentiality.
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-700 pt-4">
              Atlas provides financial education, not personalized investment or tax advice. Always consult a qualified financial advisor.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 my-12" />

        {/* Footer Sections Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {footerSections.map((section) => (
            <nav key={section.title}>
              <h3 className="font-bold text-slate-900 dark:text-white mb-6 text-xs uppercase tracking-widest opacity-80">
                {section.title}
              </h3>
              <ul className="space-y-4">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => window.location.href = item.href}
                      className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:text-teal-600 dark:active:text-teal-400 transition-all duration-150 hover:translate-x-0.5 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600 font-medium"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-800 py-8" />

        {/* Bottom Section with Social Links */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-2">
              © {currentYear} Atlas Financial. All rights reserved.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500 max-w-md">
              Atlas provides financial education, not personalized investment or tax advice.
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.open('https://twitter.com', '_blank')}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-150 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
              aria-label="Follow Atlas on Twitter"
            >
              <Twitter size={20} />
            </button>
            <button
              onClick={() => window.open('https://linkedin.com', '_blank')}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-150 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
              aria-label="Follow Atlas on LinkedIn"
            >
              <Linkedin size={20} />
            </button>
            <button
              onClick={() => window.location.href = 'mailto:support@atlas.com'}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-150 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
              aria-label="Email Atlas support"
            >
              <Mail size={20} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
