import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { PrivacyMode } from './privacyModes';
import { detectPrivacyMode, setPrivacyMode } from './privacyModes';

/**
 * T1.1: React hook for privacy mode detection and management
 *
 * Detects privacy mode from:
 * 1. URL parameter (?privacy=...)
 * 2. localStorage (user preference)
 * 3. Auth status (if available)
 * 4. Fallback: guest_local
 */
export function usePrivacyMode(isAuthenticated?: boolean) {
  const [privacyMode, setMode] = useState<PrivacyMode>('guest_local');
  const [isLoading, setIsLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get URL parameter
    const urlParam = searchParams?.get('privacy');

    // Detect privacy mode
    const detected = detectPrivacyMode({
      urlParam: urlParam || undefined,
      isAuthenticated,
    });

    setMode(detected);
    setPrivacyMode(detected);
    setIsLoading(false);
  }, [searchParams, isAuthenticated]);

  return {
    privacyMode,
    setPrivacyMode: (mode: PrivacyMode) => {
      setMode(mode);
      setPrivacyMode(mode);
    },
    isLoading,
  };
}
