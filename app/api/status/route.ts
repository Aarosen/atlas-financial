import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Simple health check — verify the API is reachable and configured
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const configured = !!apiKey;

    return NextResponse.json({
      ok: true,
      configured,
      model: 'claude-3-5-sonnet-20241022',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
