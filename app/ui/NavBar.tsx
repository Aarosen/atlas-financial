'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '@/components/Buttons';
import AtlasLogo from './AtlasLogo';

export default function NavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Hide NavBar on conversation page (it has its own TopBar)
  if (pathname === '/conversation') {
    return null;
  }

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
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && 
          hamburgerRef.current && !hamburgerRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => {
    setIsMenuOpen(false);
    hamburgerRef.current?.focus();
  };

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
            ref={hamburgerRef}
            onClick={toggleMenu}
            className="btn btnPrimary btnSm"
            aria-label="Main menu"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
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
            ref={menuRef}
            id="mobile-menu"
            className="fixed right-0 top-0 h-screen w-80 z-50 overflow-y-auto"
            style={{ 
              background: 'var(--card)',
              borderLeft: '1px solid var(--bdr)',
              boxShadow: 'var(--sh3)',
              animation: 'slideInRight 300ms cubic-bezier(0.4, 0, 0.2, 1)',
              willChange: 'transform'
            }}
            role="navigation"
            aria-label="Mobile navigation"
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
                className="iconBtn"
                style={{
                  position: 'absolute',
                  top: '24px',
                  right: '24px',
                  color: 'var(--ink2)',
                }}
                aria-label="Close menu"
              >
                <X size={24} />
              </button>

              <div style={{ paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {navItems.map((item, index) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      window.location.href = item.href;
                      closeMenu();
                    }}
                    className="atlasClickCard"
                    style={{ 
                      width: '100%',
                      textAlign: 'left',
                      padding: '12px 16px',
                      borderRadius: 'var(--r-sm)',
                      color: 'var(--ink)',
                      fontWeight: 700,
                      fontSize: '14px',
                      transitionProperty: 'background-color, transform',
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div style={{ paddingTop: '16px', borderTop: '1px solid var(--bdr)' }}>
                <button
                  onClick={() => {
                    window.location.href = '/conversation';
                    closeMenu();
                  }}
                  className="btn btnPrimary btnMd"
                  style={{ width: '100%' }}
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
