/**
 * Authentication context and utilities for Magic Link flow
 * Manages user identity, session tokens, and auth state
 */

export interface AuthSession {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface AuthState {
  session: AuthSession | null;
  loading: boolean;
  error: string | null;
}

/**
 * Get stored auth session from localStorage
 */
export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem('atlas_auth_session');
    if (!stored) return null;
    
    const session = JSON.parse(stored) as AuthSession;
    
    // Check if token has expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      localStorage.removeItem('atlas_auth_session');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error reading stored session:', error);
    return null;
  }
}

/**
 * Store auth session to localStorage
 */
export function storeSession(session: AuthSession): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('atlas_auth_session', JSON.stringify(session));
  } catch (error) {
    console.error('Error storing session:', error);
  }
}

/**
 * Clear stored auth session
 */
export function clearStoredSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('atlas_auth_session');
  } catch (error) {
    console.error('Error clearing session:', error);
  }
}

/**
 * Send magic link to email
 */
export async function sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/auth/magic-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to send magic link' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending magic link:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Extract auth tokens from URL callback (called after magic link click)
 * This is handled by the /api/auth/callback endpoint which sets cookies
 * This function checks if we're in the callback flow and extracts session data
 */
export async function handleAuthCallback(): Promise<AuthSession | null> {
  try {
    // The /api/auth/callback endpoint has already set httpOnly cookies
    // Now we need to get the user session from the server
    const response = await fetch('/api/auth/session', {
      method: 'GET',
      credentials: 'include', // Include cookies
    });

    if (!response.ok) {
      return null;
    }

    const session = await response.json() as AuthSession;
    storeSession(session);
    return session;
  } catch (error) {
    console.error('Error handling auth callback:', error);
    return null;
  }
}

/**
 * Sign out user
 */
export async function signOut(): Promise<void> {
  try {
    await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Error signing out:', error);
  } finally {
    clearStoredSession();
  }
}
