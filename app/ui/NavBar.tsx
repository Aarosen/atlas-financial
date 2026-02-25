'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { ButtonLink } from '@/components/Buttons';
import AtlasLogo from './AtlasLogo';

export default function NavBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="atlasHeader">
      <div className="atlasHeaderInner container">
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--ink)' }}>
          <AtlasLogo size={22} />
          <span style={{ fontWeight: 950, letterSpacing: '-0.02em' }}>Atlas</span>
        </Link>

        {/* Desktop Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end' }} className="hidden md:flex">
          <Link href="/" className="navLink">
            Home
          </Link>
          <Link href="/product" className="navLink">
            Product
          </Link>
          <Link href="/how-it-works" className="navLink">
            How it works
          </Link>
          <Link href="/conversation" className="navLink">
            Conversation
          </Link>
          <ButtonLink href="/conversation" variant="primary" size="sm" style={{ padding: '10px 14px', borderRadius: 14, fontWeight: 900, fontSize: 13 }}>
            Start
          </ButtonLink>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="container py-4 space-y-2">
            <Link
              href="/"
              className="block px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={closeMenu}
            >
              Home
            </Link>
            <Link
              href="/product"
              className="block px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={closeMenu}
            >
              Product
            </Link>
            <Link
              href="/how-it-works"
              className="block px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={closeMenu}
            >
              How it works
            </Link>
            <Link
              href="/conversation"
              className="block px-4 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              onClick={closeMenu}
            >
              Conversation
            </Link>
            <div className="pt-2">
              <ButtonLink
                href="/conversation"
                variant="primary"
                size="sm"
                style={{ padding: '10px 14px', borderRadius: 14, fontWeight: 900, fontSize: 13, width: '100%', textAlign: 'center' }}
                onClick={closeMenu}
              >
                Start
              </ButtonLink>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
