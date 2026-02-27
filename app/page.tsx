'use client';

import { useState } from 'react';
import { LandingScreen } from '@/screens/Landing';
import { useRouter } from 'next/navigation';

export default function Page() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const router = useRouter();

  return (
    <LandingScreen
      theme={theme}
      onToggleTheme={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      onStart={() => router.push('/conversation')}
    />
  );
}
