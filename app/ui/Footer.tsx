'use client';

import { usePathname } from 'next/navigation';
import { Lock, Mail, Linkedin, Twitter } from 'lucide-react';
import AtlasLogo from './AtlasLogo';

export default function Footer() {
  const pathname = usePathname();
  if (pathname === '/conversation') {
    return null;
  }

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
    <footer style={{ background: 'var(--bg)', borderTop: '1px solid var(--bdr)' }}>
      <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px' }}>
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
              <span style={{ fontWeight: 700, fontSize: '20px', color: 'var(--ink)' }}>Atlas</span>
            </button>
            <p style={{ fontSize: '14px', color: 'var(--ink2)', marginBottom: '32px', maxWidth: '400px', lineHeight: 1.6 }}>
              Your financial thinking partner — here to help you understand and decide.
            </p>
            <button
              onClick={() => window.location.href = '/conversation'}
              className="btn btnPrimary btnSm"
            >
              Get Started
            </button>
          </div>

          {/* Trust & Security Section */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '24px' }}>
              <div style={{ padding: '12px', background: 'var(--teal-lt)', borderRadius: 'var(--r-sm)' }}>
                <Lock size={24} style={{ color: 'var(--teal)' }} />
              </div>
              <div>
                <h2 style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: '8px' }}>Your data is secure</h2>
                <p style={{ fontSize: '14px', color: 'var(--ink2)', lineHeight: 1.6 }}>
                  Your financial information is encrypted and stored securely. Atlas prioritizes your privacy and confidentiality.
                </p>
              </div>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--ink3)', borderTop: '1px solid var(--bdr)', paddingTop: '16px' }}>
              Your data is never sold or used for advertising. Conversations are encrypted in transit and at rest.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid var(--bdr)', margin: '48px 0' }} />

        {/* Footer Sections Grid */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '32px', marginBottom: '64px' }}>
          {footerSections.map((section) => (
            <nav key={section.title} aria-label={`${section.title} navigation`}>
              <h3 style={{ fontWeight: 900, color: 'var(--ink)', marginBottom: '24px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.8 }}>
                {section.title}
              </h3>
              <ul style={{ display: 'flex', flexDirection: 'column', gap: '16px', listStyle: 'none', padding: 0, margin: 0 }}>
                {section.items.map((item, idx) => (
                  <li key={`${section.title}-${item.label}-${idx}`}>
                    <button
                      onClick={() => window.location.href = item.href}
                      className="atlasClickCard"
                      style={{ fontSize: '14px', color: 'var(--ink2)', fontWeight: 600, padding: 0 }}
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
        <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: '32px', paddingBottom: '32px' }} />

        {/* Bottom Section with Social Links */}
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
          <div>
            <p style={{ fontSize: '12px', color: 'var(--ink2)', fontWeight: 600, marginBottom: '8px' }}>
              © {currentYear} Atlas Financial. All rights reserved.
            </p>
            <p style={{ fontSize: '12px', color: 'var(--ink3)', maxWidth: '400px' }}>
              Atlas helps you learn and plan — not a licensed financial advisor. For complex decisions, consult a CFP.
            </p>
          </div>

          {/* Social Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={() => window.open('https://twitter.com', '_blank')}
              className="iconBtn"
              style={{ color: 'var(--ink2)' }}
              aria-label="Follow Atlas on Twitter"
            >
              <Twitter size={20} />
            </button>
            <button
              onClick={() => window.open('https://linkedin.com', '_blank')}
              className="iconBtn"
              style={{ color: 'var(--ink2)' }}
              aria-label="Follow Atlas on LinkedIn"
            >
              <Linkedin size={20} />
            </button>
            <button
              onClick={() => window.location.href = 'mailto:support@atlas.com'}
              className="iconBtn"
              style={{ color: 'var(--ink2)' }}
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
