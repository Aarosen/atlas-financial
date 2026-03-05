'use client';

import { useEffect, useState } from 'react';
import { LandingScreen } from '@/screens/Landing';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <LandingScreen
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      onStart={() => router.push('/conversation')}
    />
  );
}
