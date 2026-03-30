/**
 * Web Analytics configuration for Atlas Financial
 * Tracks user interactions, conversions, and engagement metrics
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
}

export interface UserAnalytics {
  userId: string;
  sessionId: string;
  events: AnalyticsEvent[];
  startTime: number;
  lastActivityTime: number;
}

const analyticsQueue: AnalyticsEvent[] = [];
const MAX_QUEUE_SIZE = 500;

export function trackEvent(
  name: string,
  properties?: Record<string, any>
): AnalyticsEvent {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: Date.now(),
  };

  analyticsQueue.push(event);
  if (analyticsQueue.length > MAX_QUEUE_SIZE) {
    analyticsQueue.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Analytics]', name, properties);
  }

  return event;
}

export function trackPageView(
  pageName: string,
  properties?: Record<string, any>
): void {
  trackEvent('page_view', {
    page: pageName,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    ...properties,
  });
}

export function trackConversion(
  conversionName: string,
  value?: number,
  properties?: Record<string, any>
): void {
  trackEvent('conversion', {
    conversion: conversionName,
    value,
    ...properties,
  });
}

export function trackUserAction(
  actionType: string,
  actionName: string,
  properties?: Record<string, any>
): void {
  trackEvent('user_action', {
    type: actionType,
    name: actionName,
    ...properties,
  });
}

export function trackEngagement(
  metric: string,
  value: number,
  properties?: Record<string, any>
): void {
  trackEvent('engagement', {
    metric,
    value,
    ...properties,
  });
}

export function trackError(
  errorName: string,
  errorMessage: string,
  properties?: Record<string, any>
): void {
  trackEvent('error', {
    error: errorName,
    message: errorMessage,
    ...properties,
  });
}

export function getAnalyticsQueue(): AnalyticsEvent[] {
  return [...analyticsQueue];
}

export function clearAnalyticsQueue(): void {
  analyticsQueue.length = 0;
}

export async function sendAnalytics(
  events: AnalyticsEvent[] = analyticsQueue
): Promise<boolean> {
  if (events.length === 0) {
    return true;
  }

  try {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
    });

    if (response.ok) {
      // Clear sent events from queue
      events.forEach((evt) => {
        const idx = analyticsQueue.indexOf(evt);
        if (idx > -1) {
          analyticsQueue.splice(idx, 1);
        }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to send analytics:', error);
    return false;
  }
}

export function setupAnalytics(): void {
  if (typeof window === 'undefined') return;

  // Track page views
  trackPageView(window.location.pathname);

  // Track user interactions
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A') {
      trackUserAction('click', target.textContent || 'unknown');
    }
  });

  // Track form submissions
  document.addEventListener('submit', (e) => {
    const form = e.target as HTMLFormElement;
    trackUserAction('form_submit', form.name || 'unknown');
  });

  // Track visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackEngagement('session_pause', 1);
      sendAnalytics();
    } else {
      trackEngagement('session_resume', 1);
    }
  });

  // Send analytics before page unload
  window.addEventListener('beforeunload', () => {
    sendAnalytics();
  });

  // Periodic analytics sending
  setInterval(() => {
    if (analyticsQueue.length > 0) {
      sendAnalytics();
    }
  }, 30000); // Every 30 seconds
}

export function getAnalyticsStats() {
  const eventCounts: Record<string, number> = {};
  analyticsQueue.forEach((evt) => {
    eventCounts[evt.name] = (eventCounts[evt.name] || 0) + 1;
  });

  return {
    totalEvents: analyticsQueue.length,
    eventCounts,
    oldestEvent: analyticsQueue[0]?.timestamp,
    newestEvent: analyticsQueue[analyticsQueue.length - 1]?.timestamp,
  };
}
