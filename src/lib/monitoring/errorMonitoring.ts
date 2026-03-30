/**
 * Real-time error monitoring for Atlas Financial
 * Captures, logs, and reports errors for debugging and analytics
 */

export interface ErrorReport {
  id: string;
  timestamp: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stack?: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  url?: string;
  userAgent?: string;
}

const errorQueue: ErrorReport[] = [];
const MAX_QUEUE_SIZE = 100;

export function captureError(
  error: Error | string,
  context?: Record<string, any>,
  severity: 'critical' | 'high' | 'medium' | 'low' = 'medium'
): ErrorReport {
  const report: ErrorReport = {
    id: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    severity,
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
  };

  // Add to queue
  errorQueue.push(report);
  if (errorQueue.length > MAX_QUEUE_SIZE) {
    errorQueue.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${severity.toUpperCase()}]`, report.message, context);
  }

  return report;
}

export function captureErrorWithUser(
  error: Error | string,
  userId: string,
  sessionId?: string,
  context?: Record<string, any>
): ErrorReport {
  const report = captureError(error, context);
  report.userId = userId;
  report.sessionId = sessionId;
  return report;
}

export function getErrorQueue(): ErrorReport[] {
  return [...errorQueue];
}

export function clearErrorQueue(): void {
  errorQueue.length = 0;
}

export async function reportErrors(
  errors: ErrorReport[] = errorQueue
): Promise<boolean> {
  if (errors.length === 0) {
    return true;
  }

  try {
    const response = await fetch('/api/monitoring/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ errors }),
    });

    if (response.ok) {
      // Clear reported errors from queue
      errors.forEach((err) => {
        const idx = errorQueue.indexOf(err);
        if (idx > -1) {
          errorQueue.splice(idx, 1);
        }
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to report errors:', error);
    return false;
  }
}

export function setupErrorMonitoring(): void {
  // Capture unhandled errors
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      captureError(event.error, {
        type: 'uncaught_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }, 'critical');
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      captureError(
        event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
        { type: 'unhandled_rejection' },
        'high'
      );
    });
  }
}

export function getErrorStats(): {
  total: number;
  bySeverity: Record<string, number>;
  recent: ErrorReport[];
} {
  return {
    total: errorQueue.length,
    bySeverity: {
      critical: errorQueue.filter((e) => e.severity === 'critical').length,
      high: errorQueue.filter((e) => e.severity === 'high').length,
      medium: errorQueue.filter((e) => e.severity === 'medium').length,
      low: errorQueue.filter((e) => e.severity === 'low').length,
    },
    recent: errorQueue.slice(-10),
  };
}
