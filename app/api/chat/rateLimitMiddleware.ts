import { NextResponse } from 'next/server';
import { checkRateLimitKv, getRateLimitHeaders } from '@/lib/api/rateLimitKv';

/**
 * Rate limit middleware for chat endpoint
 * Uses Vercel KV for distributed rate limiting
 */
export async function applyRateLimit(
  request: Request,
  identifier: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const result = await checkRateLimitKv(identifier, 'chat');

    if (!result.allowed) {
      const headers = getRateLimitHeaders(result);
      return {
        allowed: false,
        response: NextResponse.json(
          {
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
          },
          {
            status: 429,
            headers,
          }
        ),
      };
    }

    return { allowed: true };
  } catch (error) {
    console.error('[rate-limit] Error checking rate limit:', error);
    // Fail open - allow request if rate limiting fails
    return { allowed: true };
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
