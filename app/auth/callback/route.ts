import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/serverClient';

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') || '/conversation';

  const supabase = await createSupabaseServerClient();

  try {
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    } else if (tokenHash && type) {
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any });
    }
  } catch (e: any) {
    const loginUrl = new URL('/login', origin);
    loginUrl.searchParams.set('next', next);
    loginUrl.searchParams.set('error', 'access_denied');
    loginUrl.searchParams.set('error_description', String(e?.message || 'Sign-in link is invalid or expired.'));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
