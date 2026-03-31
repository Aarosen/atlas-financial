/**
 * Offline error handling for chat API
 * Preserves unsent messages and provides user-facing error messages
 */

export interface OfflineError {
  type: 'network' | 'timeout' | 'unknown';
  message: string;
  isRetryable: boolean;
}

/**
 * Detect if error is a network/offline error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    return (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('failed to fetch') ||
      message.includes('connection') ||
      message.includes('abort')
    );
  }
  return false;
}

/**
 * Classify error and return user-facing message
 */
export function classifyError(error: unknown): OfflineError {
  if (error instanceof TypeError) {
    const message = error.message.toLowerCase();
    if (message.includes('abort')) {
      return {
        type: 'timeout',
        message: 'Request timed out. Your message is saved — please try again.',
        isRetryable: true,
      };
    }
    if (message.includes('fetch') || message.includes('network') || message.includes('connection')) {
      return {
        type: 'network',
        message: 'Connection lost. Your message is saved — please try again when you\'re back online.',
        isRetryable: true,
      };
    }
  }

  return {
    type: 'unknown',
    message: 'Something went wrong. Your message is saved — please try again.',
    isRetryable: true,
  };
}

/**
 * Preserve unsent message in localStorage for recovery
 */
export function preserveUnsentMessage(message: string, sessionId: string): void {
  try {
    const key = `unsent_message_${sessionId}`;
    localStorage.setItem(key, message);
  } catch (err) {
    console.warn('Failed to preserve unsent message:', err);
  }
}

/**
 * Retrieve preserved unsent message from localStorage
 */
export function retrieveUnsentMessage(sessionId: string): string | null {
  try {
    const key = `unsent_message_${sessionId}`;
    return localStorage.getItem(key);
  } catch (err) {
    console.warn('Failed to retrieve unsent message:', err);
    return null;
  }
}

/**
 * Clear preserved unsent message after successful send
 */
export function clearUnsentMessage(sessionId: string): void {
  try {
    const key = `unsent_message_${sessionId}`;
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('Failed to clear unsent message:', err);
  }
}
