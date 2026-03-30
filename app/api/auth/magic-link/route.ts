import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { kv } from '@vercel/kv';

const MAX_MAGIC_LINKS_PER_HOUR = 3;
const HOUR_IN_SECONDS = 60 * 60;

/**
 * Check if email has exceeded magic link rate limit using Vercel KV
 * KV is persistent and shared across all Vercel instances
 */
async function checkMagicLinkRateLimit(email: string): Promise<{ allowed: boolean; resetAt?: number }> {
  try {
    const key = `magic_link_rl:${email.toLowerCase()}`;
    const count = await kv.incr(key);
    
    // Set TTL on first request
    if (count === 1) {
      await kv.expire(key, HOUR_IN_SECONDS);
    }
    
    if (count > MAX_MAGIC_LINKS_PER_HOUR) {
      const ttl = await kv.ttl(key);
      const resetAt = Date.now() + (ttl * 1000);
      return { allowed: false, resetAt };
    }
    
    return { allowed: true };
  } catch (error) {
    console.error('[magic-link] KV rate limit error:', error);
    // Fail open - allow request if KV fails
    return { allowed: true };
  }
}

/**
 * POST /api/auth/magic-link
 * Send a magic link to user's email for passwordless authentication
 * Rate limited: max 3 requests per email per hour
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body as { email?: string };

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check rate limit for this email (using KV for distributed rate limiting)
    const rateLimitCheck = await checkMagicLinkRateLimit(email.toLowerCase());
    if (!rateLimitCheck.allowed) {
      const secondsUntilReset = Math.ceil((rateLimitCheck.resetAt! - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: `Too many magic link requests. Please try again in ${Math.ceil(secondsUntilReset / 60)} minutes.`,
          retryAfter: secondsUntilReset,
        },
        { status: 429 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Send magic link
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    if (error) {
      console.error('Error sending magic link:', error);
      return NextResponse.json(
        { error: 'Failed to send magic link' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Magic link sent to email',
      email,
    });
  } catch (error) {
    console.error('Error in magic link endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
