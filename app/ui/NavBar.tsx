'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Moon, Sun, Globe } from 'lucide-react';
import { ButtonLink } from '@/components/Buttons';
import AtlasLogo from './AtlasLogo';
import type { SupportedLanguage } from '@/lib/i18n/translations';

export default function NavBar() {
  const pathname = usePathname();

  // Hide NavBar on conversation page (it has its own TopBar)
  // This must be checked BEFORE calling any hooks
  if (pathname === '/conversation') {
    return <></>;
  }

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);

  // Initialize theme and language from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('atlas_theme');
      if (saved === 'light' || saved === 'dark') {
        setTheme(saved);
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      }
    } catch {
      // ignore
    }

    try {
      const savedLang = localStorage.getItem('atlas:language');
      if (savedLang && ['en', 'es', 'fr', 'zh'].includes(savedLang)) {
        setLanguage(savedLang as SupportedLanguage);
      }
    } catch {
      // ignore
    }
  }, []);

  // TASK 1.3: Three-state theme toggle (light → dark → system)
  const toggleTheme = () => {
    const saved = localStorage.getItem('atlas_theme');
    let next: 'light' | 'dark' | null;
    
    if (!saved) {
      // Currently: system. Cycle to: force light
      next = 'light';
      localStorage.setItem('atlas_theme', 'light');
    } else if (saved === 'light') {
      // Currently: force light. Cycle to: force dark
      next = 'dark';
      localStorage.setItem('atlas_theme', 'dark');
    } else {
      // Currently: force dark. Cycle to: system (remove override)
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      next = prefersDark ? 'dark' : 'light';
      localStorage.removeItem('atlas_theme');
    }
    
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

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
    if (!isMenuOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
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
            {/* TASK 3.5: Language selector in nav */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                aria-label="Change language"
                style={{
                  background: 'transparent',
                  border: '1px solid var(--bdr)',
                  borderRadius: '50%',
                  width: 36,
                  height: 36,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--ink2)',
                  transition: 'background .2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <Globe size={18} />
              </button>
              {showLangMenu && (
                <div
                  ref={langMenuRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 8,
                    background: 'var(--card)',
                    border: '1px solid var(--bdr)',
                    borderRadius: 'var(--r-sm)',
                    boxShadow: 'var(--sh2)',
                    minWidth: 160,
                    zIndex: 100,
                  }}
                >
                  {(['en', 'es', 'fr', 'zh'] as const).map((lang) => (
                    <button
                      key={lang}
                      onClick={() => {
                        setLanguage(lang);
                        try {
                          localStorage.setItem('atlas:language', lang);
                        } catch {
                          // ignore
                        }
                        setShowLangMenu(false);
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: language === lang ? 'var(--bg2)' : 'transparent',
                        color: 'var(--ink)',
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background .2s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = language === lang ? 'var(--bg2)' : 'transparent')}
                    >
                      {lang === 'en' && 'English'}
                      {lang === 'es' && 'Español'}
                      {lang === 'fr' && 'Français'}
                      {lang === 'zh' && '中文'}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* TASK 1.3: Theme toggle button in nav */}
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              style={{
                background: 'transparent',
                border: '1px solid var(--bdr)',
                borderRadius: '50%',
                width: 36,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'var(--ink2)',
                transition: 'background .2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
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
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            style={{
              background: 'transparent',
              border: '1px solid var(--bdr)',
              borderRadius: 'var(--r-sm)',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--ink)',
              flexShrink: 0,
            }}
          >
            {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {isMobile && isMenuOpen && (
        <>
          {/* Backdrop overlay — click to close */}
          <div
            onClick={closeMenu}
            aria-hidden="true"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 40,
              background: 'rgba(0, 0, 0, 0.5)',
            }}
          />

          {/* Drawer panel */}
          <div
            ref={menuRef}
            id="mobile-menu"
            role="navigation"
            aria-label="Mobile navigation"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              height: '100dvh',
              width: 'min(280px, 80vw)',
              zIndex: 50,
              background: 'var(--card)',
              borderLeft: '1px solid var(--bdr)',
              boxShadow: 'var(--sh3)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'atlasDrawerIn 280ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Nav items — flex:1 makes this section grow and push Start to the bottom */}
            <nav style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '24px 16px 0 16px',
              gap: 4,
              overflowY: 'auto',
            }}>
              {navItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    window.location.href = item.href;
                    closeMenu();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    minHeight: 52,
                    padding: '0 16px',
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--r-sm)',
                    color: 'var(--ink)',
                    fontWeight: 700,
                    fontSize: 15,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Start CTA — pinned to bottom by flex layout above */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid var(--bdr)',
              flexShrink: 0,
            }}>
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
        </>
      )}
    </div>
  );
}
