import { kv } from '@vercel/kv';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const configs: Record<string, RateLimitConfig> = {
  chat_guest: { maxRequests: 30, windowMs: 60000 },
  chat_auth: { maxRequests: 100, windowMs: 60000 },
  chat: { maxRequests: 30, windowMs: 60000 },
  api: { maxRequests: 100, windowMs: 60000 },
  auth: { maxRequests: 5, windowMs: 60000 },
};

export async function checkRateLimitKv(
  identifier: string,
  type: keyof typeof configs = 'api'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  try {
    const config = configs[type];
    const key = `ratelimit:${type}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Get current count
    const count = await kv.get<number>(key);
    const currentCount = count || 0;

    if (currentCount >= config.maxRequests) {
      const ttl = await kv.ttl(key);
      const resetAt = ttl > 0 ? now + ttl * 1000 : now + config.windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    // Increment counter
    const newCount = currentCount + 1;
    await kv.setex(key, Math.ceil(config.windowMs / 1000), newCount);

    const remaining = Math.max(0, config.maxRequests - newCount);
    const resetAt = now + config.windowMs;

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  } catch (error) {
    console.error('[ratelimit-kv] Error checking rate limit:', error);
    // Fail open - allow request if KV is unavailable
    return {
      allowed: true,
      remaining: -1,
      resetAt: Date.now() + 60000,
    };
  }
}

export function getRateLimitHeaders(result: {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}): Record<string, string> {
  return {
    'X-RateLimit-Limit': '30',
    'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
  };
}
