import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/auth/callback
 * Handles the callback from Supabase Auth after magic link click
 * Exchanges the session for a user token and redirects to app
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') || '/';

    if (!code) {
      return NextResponse.redirect(new URL('/?error=no_code', req.url));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.redirect(new URL('/?error=supabase_not_configured', req.url));
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/?error=auth_failed', req.url));
    }

    // Create response that redirects to app
    const response = NextResponse.redirect(new URL(next, req.url));

    // Set auth cookie with session token
    response.cookies.set('sb-access-token', data.session.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set('sb-refresh-token', data.session.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/?error=callback_error', req.url));
  }
}
