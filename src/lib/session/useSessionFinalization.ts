import { useCallback, useEffect } from 'react';
import { persistFinancialProfile } from '@/lib/ai/conversationGoalWiring';

/**
 * Hook to handle session finalization when user closes conversation
 * Uses navigator.sendBeacon for reliable data delivery on page unload
 */
export function useSessionFinalization() {
  const finalizeSession = useCallback(
    async (userId: string | null, sessionId: string | null, conversationText: string, financialData: Record<string, any>) => {
      if (!userId || !sessionId) {
        return;
      }

      try {
        const payload = JSON.stringify({
          userId,
          sessionId,
          conversationText,
          financialData,
        });

        // Try sendBeacon first (reliable on unload), fall back to fetch for normal flow
        if (navigator.sendBeacon) {
          const sent = navigator.sendBeacon('/api/chat/finalize', payload);
          if (sent) {
            console.log('[companion] Session finalized via sendBeacon');
            // PROFILE PERSISTENCE: Also persist financial profile at session end
            await persistFinancialProfile(userId, sessionId, financialData, conversationText);
            return;
          }
        }

        // Fallback to fetch for normal navigation
        const response = await fetch('/api/chat/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          // Use keepalive to ensure request completes even if page unloads
          keepalive: true,
        });

        if (!response.ok) {
          console.error('Error finalizing session:', response.status);
          return;
        }

        const data = await response.json();
        console.log('[companion] Session finalized:', data);
        
        // PROFILE PERSISTENCE: Also persist financial profile at session end
        await persistFinancialProfile(userId, sessionId, financialData, conversationText);
      } catch (error) {
        console.error('Error finalizing session:', error);
      }
    },
    []
  );

  // Set up beforeunload handler to finalize session when user leaves
  useEffect(() => {
    const handleBeforeUnload = () => {
      // beforeunload handler is called from AtlasApp to ensure we have latest state
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return { finalizeSession };
}
