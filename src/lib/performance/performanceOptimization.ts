/**
 * Performance optimization utilities for Atlas Financial
 * Monitors and optimizes application performance
 */

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceEntryWithRenderTime extends PerformanceEntry {
  renderTime?: number;
  loadTime?: number;
}

const metrics: PerformanceMetric[] = [];
const MAX_METRICS = 1000;

export function measurePerformance<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, any>
): T {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  recordMetric(name, duration, metadata);

  if (duration > 1000) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

export async function measureAsyncPerformance<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, any>
): Promise<T> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  recordMetric(name, duration, metadata);

  if (duration > 1000) {
    console.warn(`[Performance] ${name} took ${duration.toFixed(2)}ms`);
  }

  return result;
}

function recordMetric(
  name: string,
  duration: number,
  metadata?: Record<string, any>
): void {
  const metric: PerformanceMetric = {
    name,
    duration,
    timestamp: Date.now(),
    metadata,
  };

  metrics.push(metric);
  if (metrics.length > MAX_METRICS) {
    metrics.shift();
  }
}

export function getMetrics(name?: string): PerformanceMetric[] {
  if (!name) return [...metrics];
  return metrics.filter((m) => m.name === name);
}

export function getPerformanceStats(name?: string) {
  const relevantMetrics = name ? getMetrics(name) : metrics;

  if (relevantMetrics.length === 0) {
    return null;
  }

  const durations = relevantMetrics.map((m) => m.duration);
  const sum = durations.reduce((a, b) => a + b, 0);
  const avg = sum / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];

  return {
    count: durations.length,
    avg: parseFloat(avg.toFixed(2)),
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    p95: parseFloat(p95.toFixed(2)),
  };
}

export function clearMetrics(): void {
  metrics.length = 0;
}

// Web Vitals monitoring
export function monitorWebVitals(): void {
  if (typeof window === 'undefined') return;

  // Largest Contentful Paint (LCP)
  if ('PerformanceObserver' in window) {
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntryWithRenderTime;
        const lcpTime = lastEntry.renderTime || lastEntry.loadTime || 0;
        recordMetric('LCP', lcpTime);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
    } catch (e) {
      console.error('LCP observer error:', e);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          recordMetric('FID', entry.processingDuration);
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
    } catch (e) {
      console.error('FID observer error:', e);
    }

    // Cumulative Layout Shift (CLS)
    try {
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            recordMetric('CLS', entry.value * 100);
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    } catch (e) {
      console.error('CLS observer error:', e);
    }
  }
}

// Memory optimization
export function optimizeMemory(): void {
  if (typeof window === 'undefined') return;

  // Clear old metrics periodically
  setInterval(() => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;
    const index = metrics.findIndex((m) => m.timestamp > fiveMinutesAgo);
    if (index > 0) {
      metrics.splice(0, index);
    }
  }, 60000); // Every minute
}

// Lazy loading optimization
export function lazyLoadImage(img: HTMLImageElement): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          img.src = img.dataset.src || '';
          observer.unobserve(img);
        }
      });
    });
    observer.observe(img);
  } else {
    // Fallback for older browsers
    img.src = img.dataset.src || '';
  }
}

// Request deduplication
const requestCache = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttl = 5000
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key)!;
  }

  const promise = fn();
  requestCache.set(key, promise);

  setTimeout(() => {
    requestCache.delete(key);
  }, ttl);

  return promise;
}
