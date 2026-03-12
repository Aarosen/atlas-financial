'use client';

import { useEffect, useState } from 'react';
import { LandingScreen } from '@/screens/Landing';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    try {
      const stored = window.localStorage.getItem('atlas:theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch {
      // ignore
    }
    return 'light';
  });
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      window.localStorage.setItem('atlas:theme', theme);
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
