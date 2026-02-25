'use client';

import AtlasLogo from './AtlasLogo';
import { ArrowRight, Mail, Zap } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerSections = [
    {
      title: 'Product',
      items: [
        { label: 'Features', href: '/product', icon: '✨' },
        { label: 'How it Works', href: '/how-it-works', icon: '🎯' },
        { label: 'Start Chatting', href: '/conversation', icon: '💬' },
      ],
    },
    {
      title: 'Resources',
      items: [
        { label: 'About', href: '/about', icon: 'ℹ️' },
        { label: 'Contact', href: '/contact', icon: '✉️' },
        { label: 'Privacy Policy', href: '/privacy', icon: '🔒' },
      ],
    },
    {
      title: 'Legal',
      items: [
        { label: 'Terms & Conditions', href: '/terms', icon: '📋' },
        { label: 'Disclaimer', href: '/disclaimer', icon: '⚠️' },
      ],
    },
  ];

  return (
    <footer className="bg-slate-950 text-white mt-20 border-t border-slate-800">
      {/* Main Footer */}
      <div className="container py-16">
        {/* Top Section - Brand & CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1">
            <button
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-3 mb-6 hover:opacity-80 transition-opacity group"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <div className="p-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg group-hover:shadow-lg group-hover:shadow-teal-500/50 transition-all">
                <AtlasLogo size={24} />
              </div>
              <span className="font-bold text-xl">Atlas</span>
            </button>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">
              Your financial intelligence companion. Education, not advice.
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Zap size={14} className="text-teal-500" />
              <span>AI-powered financial guidance</span>
            </div>
          </div>

          {/* Newsletter CTA */}
          <div className="lg:col-span-2 bg-gradient-to-r from-teal-900/30 to-slate-900/30 border border-teal-800/50 rounded-xl p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <Mail size={20} className="text-teal-400" />
                  Stay Updated
                </h3>
                <p className="text-sm text-slate-400">Get financial tips and Atlas updates delivered to your inbox.</p>
              </div>
              <button
                onClick={() => window.location.href = '/contact'}
                className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/50 hover:-translate-y-0.5 whitespace-nowrap flex items-center gap-2"
              >
                Get Started
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 my-12" />

        {/* Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-white mb-6 uppercase tracking-widest text-slate-300">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <button
                      onClick={() => window.location.href = item.href}
                      className="group flex items-center gap-3 text-sm text-slate-400 hover:text-teal-400 transition-colors duration-200"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      <span className="text-lg group-hover:scale-110 transition-transform">{item.icon}</span>
                      <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 pt-8" />

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>©</span>
            <span>{currentYear} Atlas Financial</span>
            <span className="text-slate-700">•</span>
            <span>All rights reserved</span>
          </div>
          <p className="text-center sm:text-right max-w-sm">
            Atlas provides financial education, not personalized investment or tax advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
