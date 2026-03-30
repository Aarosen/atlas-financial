import { useEffect, useState } from 'react';
import { AuthSession, getStoredSession, handleAuthCallback, clearStoredSession, storeSession } from './authContext';

export function useAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // First check if we're in an auth callback flow
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('code')) {
          const callbackSession = await handleAuthCallback();
          if (callbackSession) {
            setSession(callbackSession);
            storeSession(callbackSession);
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          // Check for stored session
          const storedSession = getStoredSession();
          setSession(storedSession);
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
        setError('Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Fix C & 7: Token refresh monitoring - check expiry every 5 minutes
  useEffect(() => {
    if (!session) return;

    const checkAndRefreshToken = async () => {
      const now = Date.now();
      const timeUntilExpiry = session.expiresAt - now;
      
      // If token expires within 5 minutes OR is already expired, attempt refresh
      if (timeUntilExpiry < 5 * 60 * 1000) {
        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: session.refreshToken }),
          });

          if (response.ok) {
            const newSession = await response.json() as AuthSession;
            setSession(newSession);
            storeSession(newSession);
            console.log('[auth] Token refreshed successfully');
          } else {
            // Refresh failed - clear session and force re-login
            console.warn('[auth] Token refresh failed, clearing session');
            clearStoredSession();
            setSession(null);
            setError('Your session expired. Please sign in again.');
          }
        } catch (err) {
          console.error('[auth] Error refreshing token:', err);
          // On network error, keep session but log the issue
        }
      }
    };

    // Check token every 5 minutes
    const interval = setInterval(checkAndRefreshToken, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  const signOut = async () => {
    try {
      await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      clearStoredSession();
      setSession(null);
    }
  };

  return {
    session,
    loading,
    error,
    isAuthenticated: !!session,
    userId: session?.userId || null,
    email: session?.email || null,
    signOut,
  };
}
