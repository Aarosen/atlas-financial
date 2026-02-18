export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL_set: !!url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_set: !!anon,
    SUPABASE_SERVICE_ROLE_KEY_set: !!service,
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
