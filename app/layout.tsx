import './globals.css';
import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import NavBar from './ui/NavBar';
import Footer from './ui/Footer';
import PageTransition from './ui/PageTransition';
import { UserProvider } from '@/lib/auth/userProvider';
import { ClientInitializer } from './ui/ClientInitializer';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas — Your Financial Companion',
  description: 'Atlas is your financial thinking partner — a private, conversation-based tool that gives you one clear next step with your money. No bank sync. No shame.',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Atlas — Your Financial Companion',
    description: 'Talk to Atlas about your money. Get one clear, honest next step — no forms, no shame, no bank connections.',
    url: 'https://atlas-financial.vercel.app',
    siteName: 'Atlas',
    images: [
      {
        url: 'https://atlas-financial.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Atlas Financial Companion',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Atlas — Your Financial Companion',
    description: 'Talk to Atlas about your money. Get one clear, honest next step.',
    images: ['https://atlas-financial.vercel.app/og-image.png'],
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
          <ClientInitializer />
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
