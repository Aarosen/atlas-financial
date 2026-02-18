import './globals.css';
import type { Metadata } from 'next';
import { Inter, Sora } from 'next/font/google';
import type { ReactNode } from 'react';
import NavBar from './ui/NavBar';
import PageTransition from './ui/PageTransition';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas — Your Financial Companion',
  description: 'Atlas — Your Financial Intelligence Companion',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${sora.variable}`}>
        <NavBar />
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
