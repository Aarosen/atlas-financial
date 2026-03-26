import { useEffect, useState } from 'react';
import { AuthSession, getStoredSession, handleAuthCallback, clearStoredSession } from './authContext';

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
