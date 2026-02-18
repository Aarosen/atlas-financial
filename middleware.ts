import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: any };

export async function middleware(req: NextRequest) {
  const authEnabled = process.env.ATLAS_AUTH_ENABLED === '1';
  if (!authEnabled) return NextResponse.next();

  const res = NextResponse.next();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return res;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Refresh session if needed
  await supabase.auth.getUser();

  const { data } = await supabase.auth.getSession();
  const isAuthed = !!data.session;

  const pathname = req.nextUrl.pathname;
  const isProtected = pathname.startsWith('/conversation') || pathname.startsWith('/dashboard');

  if (isProtected && !isAuthed) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ['/conversation', '/conversation/:path*', '/dashboard', '/dashboard/:path*'],
};
