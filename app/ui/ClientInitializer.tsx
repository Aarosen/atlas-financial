'use client';

import { useEffect } from 'react';

/**
 * Client-side initialization component
 * Initializes error monitoring, web analytics, hydration fixes, and performance monitoring
 */
export function ClientInitializer() {
  useEffect(() => {
    // Initialize monitoring and analytics systems
    const initializeMonitoring = async () => {
      try {
        // Error monitoring
        const errorMon = await import('@/lib/monitoring/errorMonitoring').catch(() => null);
        if (errorMon) {
          console.log('[atlas] Error monitoring available');
        }

        // Web analytics
        const analytics = await import('@/lib/analytics/webAnalytics').catch(() => null);
        if (analytics?.trackEvent) {
          analytics.trackEvent('app_initialized');
        }

        // Hydration fixes
        const hydration = await import('@/lib/hydration/hydrationFix').catch(() => null);
        if (hydration?.sanitizeUrlParams) {
          hydration.sanitizeUrlParams();
        }
        if (hydration?.preventHydrationMismatch) {
          hydration.preventHydrationMismatch();
        }

        // Performance monitoring
        const perf = await import('@/lib/performance/performanceOptimization').catch(() => null);
        if (perf?.monitorWebVitals) {
          perf.monitorWebVitals();
        }
      } catch (error) {
        // Silently fail if initialization fails
        console.debug('[atlas] Monitoring initialization skipped');
      }
    };

    initializeMonitoring();
  }, []);

  return null;
}
