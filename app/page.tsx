'use client';

import { useEffect, useState } from 'react';
import { LandingScreen } from '@/screens/Landing';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      // Use same key as layout.tsx and NavBar.tsx for consistency
      const stored = window.localStorage.getItem('atlas_theme');
      if (stored === 'light' || stored === 'dark') return stored;
      // If no stored preference, check system preference (same as layout.tsx)
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      return prefersDark ? 'dark' : 'light';
    } catch {
      // ignore
    }
    return 'light';
  });
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      // Use same key as layout.tsx and NavBar.tsx for consistency
      window.localStorage.setItem('atlas_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  return (
    <LandingScreen
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      onStart={() => router.push('/conversation')}
    />
  );
}
