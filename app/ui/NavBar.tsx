'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '@/components/Buttons';
import AtlasLogo from './AtlasLogo';

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const navItems = [
    { label: 'Home', href: '/' },
    { label: 'Product', href: '/product' },
    { label: 'How it works', href: '/how-it-works' },
    { label: 'Conversation', href: '/conversation' },
  ];

  return (
    <div className="atlasHeader">
      <div className="atlasHeaderInner container">
        <button
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          style={{ textDecoration: 'none', color: 'var(--ink)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          <AtlasLogo size={22} />
          <span style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Atlas</span>
        </button>

        {/* Desktop Navigation - Only visible on desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => window.location.href = item.href}
                className="navLink"
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {item.label}
              </button>
            ))}
            <ButtonLink href="/conversation" variant="primary" size="sm" style={{ padding: '10px 14px', borderRadius: 14, fontWeight: 900, fontSize: 13 }}>
              Start
            </ButtonLink>
          </div>
        )}

        {/* Mobile Menu Button - Only visible on mobile */}
        {isMobile && (
          <button
            onClick={toggleMenu}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Navigation Menu - Slides from right, only on mobile */}
      {isMobile && isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity"
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className="fixed right-0 top-0 h-screen w-64 bg-white dark:bg-slate-900 shadow-lg z-50 overflow-y-auto animate-in slide-in-from-right-64">
            <div className="p-6 space-y-2">
              <button
                onClick={closeMenu}
                className="absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>

              <div className="pt-8 space-y-2">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      window.location.href = item.href;
                      closeMenu();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <ButtonLink
                  href="/conversation"
                  variant="primary"
                  size="sm"
                  style={{ padding: '12px 14px', borderRadius: 14, fontWeight: 900, fontSize: 13, width: '100%', textAlign: 'center', display: 'block' }}
                  onClick={closeMenu}
                >
                  Start
                </ButtonLink>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
