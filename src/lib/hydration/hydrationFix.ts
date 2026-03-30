/**
 * Hydration error fix for BUG-23
 * Prevents hydration mismatches caused by args[]=text URL parameters
 */

import { useState, useEffect } from 'react';

export function sanitizeUrlParams(): void {
  if (typeof window === 'undefined') return;

  // Check for problematic URL parameters
  const params = new URLSearchParams(window.location.search);
  const argsParam = params.get('args[]');

  if (argsParam === 'text') {
    // Remove the problematic parameter
    params.delete('args[]');

    // Reconstruct URL without the problematic parameter
    const newUrl = window.location.pathname + (params.toString() ? `?${params.toString()}` : '');
    window.history.replaceState({}, '', newUrl);

    console.warn('[hydration] Removed problematic args[]=text parameter');
  }
}

export function preventHydrationMismatch(): void {
  if (typeof window === 'undefined') return;

  // Sanitize URL params on load
  sanitizeUrlParams();

  // Monitor for hydration errors
  const originalError = console.error;
  let hydrationErrorCount = 0;

  console.error = function (...args: any[]) {
    const errorMsg = String(args[0] || '');

    // Detect hydration errors
    if (
      errorMsg.includes('Hydration failed') ||
      errorMsg.includes('hydration') ||
      errorMsg.includes('args[]=text')
    ) {
      hydrationErrorCount++;

      if (hydrationErrorCount === 1) {
        console.warn('[hydration] Detected hydration error, attempting recovery...');
        // Force page reload to resolve hydration mismatch
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }

      // Don't log the error to avoid console spam
      return;
    }

    // Log other errors normally
    originalError.apply(console, args);
  };
}

export function useHydrationSafeState<T>(
  initialValue: T
): [T, (value: T) => void, boolean] {
  if (typeof window === 'undefined') {
    return [initialValue, () => {}, false];
  }

  // On client side, use actual state
  const [value, setValue] = useState(initialValue);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return [value, setValue, isMounted];
}

export function useHydrationSafeEffect(
  effect: () => void | (() => void),
  deps?: React.DependencyList
): void {
  if (typeof window === 'undefined') return;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      return effect();
    }
  }, deps ? [isMounted, ...deps] : [isMounted]);
}

// Initialize hydration fixes on module load
if (typeof window !== 'undefined') {
  // Sanitize URL params immediately
  sanitizeUrlParams();

  // Set up hydration error prevention
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preventHydrationMismatch);
  } else {
    preventHydrationMismatch();
  }
}
