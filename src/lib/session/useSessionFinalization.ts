import { useCallback, useEffect } from 'react';

/**
 * Hook to handle session finalization when user closes conversation
 * Calls /api/chat/finalize endpoint to persist session data to Supabase
 */
export function useSessionFinalization() {
  const finalizeSession = useCallback(
    async (userId: string | null, sessionId: string | null, conversationText: string, financialData: Record<string, any>) => {
      if (!userId || !sessionId) {
        return;
      }

      try {
        const response = await fetch('/api/chat/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            sessionId,
            conversationText,
            financialData,
          }),
        });

        if (!response.ok) {
          console.error('Error finalizing session:', response.status);
          return;
        }

        const data = await response.json();
        console.log('[companion] Session finalized:', data);
      } catch (error) {
        console.error('Error finalizing session:', error);
      }
    },
    []
  );

  // Set up beforeunload handler to finalize session when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Note: We can't make async calls in beforeunload, so we rely on the frontend
      // to call finalizeSession explicitly before navigation
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return { finalizeSession };
}
