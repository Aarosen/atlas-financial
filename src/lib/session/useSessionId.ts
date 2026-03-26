import { useEffect, useState } from 'react';

/**
 * Hook to manage sessionId across conversation
 * SessionId is obtained from first API response and persisted in sessionStorage
 * This ensures all subsequent messages in the same conversation use the same sessionId
 */
export function useSessionId() {
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const stored = sessionStorage.getItem('atlas_session_id');
      if (stored) {
        setSessionId(stored);
      }
    } catch (error) {
      console.error('Error reading sessionId from storage:', error);
    }
  }, []);

  // Store sessionId when it changes
  const updateSessionId = (newSessionId: string) => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.setItem('atlas_session_id', newSessionId);
      setSessionId(newSessionId);
    } catch (error) {
      console.error('Error storing sessionId:', error);
    }
  };

  // Clear sessionId (e.g., when starting new conversation)
  const clearSessionId = () => {
    if (typeof window === 'undefined') return;

    try {
      sessionStorage.removeItem('atlas_session_id');
      setSessionId(null);
    } catch (error) {
      console.error('Error clearing sessionId:', error);
    }
  };

  return {
    sessionId,
    updateSessionId,
    clearSessionId,
  };
}
