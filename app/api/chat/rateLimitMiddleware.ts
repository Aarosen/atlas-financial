import { NextResponse } from 'next/server';
import { checkRateLimitKv, getRateLimitHeaders } from '@/lib/api/rateLimitKv';

/**
 * Rate limit middleware for chat endpoint
 * Uses Vercel KV for distributed rate limiting
 * Enforces both per-minute and daily limits
 */
export async function applyRateLimit(
  request: Request,
  identifier: string,
  isAuthenticated: boolean = false
): Promise<{ allowed: boolean; remaining?: number; response?: NextResponse }> {
  try {
    const limitType = isAuthenticated ? 'chat_auth' : 'chat_guest';
    const result = await checkRateLimitKv(identifier, limitType);

    if (!result.allowed) {
      const headers = getRateLimitHeaders(result);
      const retryAfterSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
      
      // User-facing error message for rate limiting
      const errorMessage = `You're sending messages too quickly. Please wait ${retryAfterSeconds} seconds.`;
      
      return {
        allowed: false,
        remaining: result.remaining,
        response: NextResponse.json(
          {
            error: 'rate_limited',
            message: errorMessage,
            retryAfter: retryAfterSeconds,
          },
          {
            status: 429,
            headers,
          }
        ),
      };
    }

    return { allowed: true, remaining: result.remaining };
  } catch (error) {
    console.error('[rate-limit] Error checking rate limit:', error);
    // REM-I: Fail open - allow request if rate limiting fails, but report degraded mode
    // remaining: 0 signals to caller that KV is unavailable and in-memory fallback is active
    return { allowed: true, remaining: 0 };
  }
}

export function addRateLimitHeaders(
  response: NextResponse,
  result: { allowed: boolean; remaining: number; resetAt: number }
): NextResponse {
  const headers = getRateLimitHeaders(result);
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}
