/**
 * Error monitoring and logging utility
 * Integrates with Sentry when available, falls back to console logging
 */

type ErrorLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Capture an exception
 * Logs error to monitoring service and console
 */
export function captureException(error: Error | unknown, context?: Record<string, any>) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Log to console
  console.error('Error captured:', errorMessage, context);
  if (errorStack) {
    console.error('Stack trace:', errorStack);
  }

  // Try to send to Sentry if available
  if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
    try {
      (window as any).__SENTRY__.captureException(error, { contexts: context ? { custom: context } : undefined });
    } catch {
      // Sentry not available, continue
    }
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: ErrorLevel = 'error', context?: Record<string, any>) {
  console.log(`[${level.toUpperCase()}] ${message}`, context);

  // Try to send to Sentry if available
  if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
    try {
      (window as any).__SENTRY__.captureMessage(message, level);
      if (context) {
        (window as any).__SENTRY__.setContext('custom', context);
      }
    } catch {
      // Sentry not available, continue
    }
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string) {
  if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
    try {
      (window as any).__SENTRY__.setUser({
        id: userId,
        email,
        username,
      });
    } catch {
      // Sentry not available, continue
    }
  }
}

/**
 * Clear user context
 */
export function clearUserContext() {
  if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
    try {
      (window as any).__SENTRY__.setUser(null);
    } catch {
      // Sentry not available, continue
    }
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category: string = 'custom', level: ErrorLevel = 'info', data?: Record<string, any>) {
  console.log(`[BREADCRUMB] ${category}: ${message}`, data);

  if (typeof window !== 'undefined' && (window as any).__SENTRY__) {
    try {
      (window as any).__SENTRY__.addBreadcrumb({
        message,
        category,
        level,
        data,
      });
    } catch {
      // Sentry not available, continue
    }
  }
}

/**
 * Wrap async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, any>
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    captureException(error, context);
    return null;
  }
}

/**
 * Wrap sync function with error handling
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context?: Record<string, any>
): T | null {
  try {
    return fn();
  } catch (error) {
    captureException(error, context);
    return null;
  }
}
