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

  useEffect(() => {
    if (!isMobile) {
      setIsMenuOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

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
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
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
            <ButtonLink href="/conversation" variant="primary" size="sm" style={{ padding: '10px 14px', borderRadius: 24, fontWeight: 900, fontSize: 13 }}>
              Start
            </ButtonLink>
          </div>
        )}

        {/* Mobile Menu Button - Only visible on mobile */}
        {isMobile && (
          <button
            onClick={toggleMenu}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-full transition-all duration-200 flex items-center justify-center gap-2 hover:scale-105 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
            aria-label="Toggle navigation menu"
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X size={20} className="transition-transform duration-200" /> : <Menu size={20} className="transition-transform duration-200" />}
          </button>
        )}
      </div>

      {/* Mobile Navigation Menu - Slides from right, only on mobile */}
      {isMobile && isMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ease-in-out"
            onClick={closeMenu}
            aria-hidden="true"
            style={{ animation: 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
          <div 
            className="fixed right-0 top-0 h-screen w-80 bg-white dark:bg-slate-950 shadow-lg z-50 overflow-y-auto border-l border-slate-200 dark:border-slate-800"
            style={{ 
              animation: 'slideInRight 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform'
            }}
          >
            <style>{`
              @keyframes slideInRight {
                from {
                  transform: translateX(100%);
                }
                to {
                  transform: translateX(0);
                }
              }
              @keyframes fadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }
            `}</style>
            <div className="p-6 space-y-2">
              <button
                onClick={closeMenu}
                className="absolute top-6 right-6 p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors duration-150 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>

              <div className="pt-8 space-y-1">
                {navItems.map((item, index) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      window.location.href = item.href;
                      closeMenu();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 active:bg-slate-200 dark:active:bg-slate-700 transition-all duration-150 font-medium hover:translate-x-1 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
                    style={{ 
                      transitionProperty: 'background-color, transform',
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    window.location.href = '/conversation';
                    closeMenu();
                  }}
                  className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold rounded-full transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/30 active:shadow-md hover:scale-102 active:scale-98 focus:outline-2 focus:outline-offset-2 focus:outline-teal-600"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
