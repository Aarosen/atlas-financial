/**
 * Rate limiting utility for API endpoints
 * Guest: 20 requests/minute
 * Authenticated: 100 requests/minute
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

// In-memory store for rate limiting (reset on server restart)
const rateLimitStore: RateLimitStore = {};

const GUEST_LIMIT = 20; // requests per minute
const AUTH_LIMIT = 100; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Check if request is rate limited
 * Returns { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(
  identifier: string,
  isAuthenticated: boolean = false
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const limit = isAuthenticated ? AUTH_LIMIT : GUEST_LIMIT;
  const now = Date.now();
  const key = `${identifier}:${isAuthenticated ? 'auth' : 'guest'}`;

  // Initialize or reset if window expired
  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = {
      count: 0,
      resetAt: now + WINDOW_MS,
    };
  }

  const record = rateLimitStore[key];
  const allowed = record.count < limit;

  if (allowed) {
    record.count++;
  }

  return {
    allowed,
    remaining: Math.max(0, limit - record.count),
    resetAt: record.resetAt,
  };
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(
  identifier: string,
  isAuthenticated: boolean = false
): Record<string, string> {
  const limit = isAuthenticated ? AUTH_LIMIT : GUEST_LIMIT;
  const rateLimit = checkRateLimit(identifier, isAuthenticated);

  return {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(rateLimit.remaining),
    'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetAt / 1000)),
  };
}

/**
 * Extract client identifier from request
 * Uses IP address or user ID
 */
export function getClientIdentifier(request: Request, userId?: string): string {
  if (userId) {
    return userId;
  }

  // Try to get IP from headers
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';

  return ip;
}
