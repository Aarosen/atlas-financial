// Authentication Configuration - Supports Clerk, NextAuth.js, and MVP Login
// Phase 2C: Production-grade authentication setup

export type AuthProvider = 'clerk' | 'nextauth' | 'mvp';

export interface AuthConfig {
  provider: AuthProvider;
  clerkPublishableKey?: string;
  nextAuthSecret?: string;
  nextAuthUrl?: string;
  mvpEnabled: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  expiresAt: Date;
  token?: string;
}

// Detect which auth provider to use based on environment variables
export function getAuthConfig(): AuthConfig {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  const nextAuthUrl = process.env.NEXTAUTH_URL;

  // Priority: Clerk > NextAuth > MVP
  if (clerkKey) {
    return {
      provider: 'clerk',
      clerkPublishableKey: clerkKey,
      mvpEnabled: false,
    };
  }

  if (nextAuthSecret && nextAuthUrl) {
    return {
      provider: 'nextauth',
      nextAuthSecret,
      nextAuthUrl,
      mvpEnabled: false,
    };
  }

  // Fallback to MVP for development
  return {
    provider: 'mvp',
    mvpEnabled: true,
  };
}

// Auth provider detection for client-side
export function getClientAuthProvider(): AuthProvider {
  // Check for Clerk
  if (typeof window !== 'undefined' && (window as any).__clerk_loaded) {
    return 'clerk';
  }

  // Check for NextAuth session
  if (typeof window !== 'undefined' && (window as any).__nextauth) {
    return 'nextauth';
  }

  // Default to MVP
  return 'mvp';
}

// Validate auth configuration
export function validateAuthConfig(config: AuthConfig): boolean {
  switch (config.provider) {
    case 'clerk':
      return !!config.clerkPublishableKey;
    case 'nextauth':
      return !!config.nextAuthSecret && !!config.nextAuthUrl;
    case 'mvp':
      return config.mvpEnabled;
    default:
      return false;
  }
}
