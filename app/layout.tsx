import './globals.css';
import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import NavBar from './ui/NavBar';
import Footer from './ui/Footer';
import PageTransition from './ui/PageTransition';
import { UserProvider } from '@/lib/auth/userProvider';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas — Your Financial Companion',
  description: 'Atlas — Your Financial Intelligence Companion',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <head>
        {/* TASK 1.4 PART A: Inline blocking script for theme persistence - eliminates FOUC */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // 1. Check localStorage for an explicit user choice
                var saved = localStorage.getItem('atlas_theme');
                // 2. If no user choice, check system preference
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                // 3. Apply immediately — before React mounts
                var theme = saved ? saved : (prefersDark ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', theme);
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${sora.variable}`}>
        <UserProvider>
          <header role="banner" style={{ display: 'contents' }}>
            <NavBar />
          </header>
          <main role="main">
            <PageTransition>{children}</PageTransition>
          </main>
          <Footer />
        </UserProvider>
      </body>
    </html>
  );
}
