export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not found', { status: 404 });
  }

  const token = process.env.ATLAS_DEBUG_TOKEN;
  if (!token) {
    return new NextResponse('Not found', { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL_set: !!url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_set: !!anon,
    NEXT_PUBLIC_SUPABASE_URL_host: url
      ? (() => {
          try {
            return new URL(url).host;
          } catch {
            return 'invalid_url';
          }
        })()
      : null,
  });
}
