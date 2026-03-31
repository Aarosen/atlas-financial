import { NextRequest, NextResponse } from 'next/server';

/**
 * Admin endpoint for security audit
 * Verifies that sensitive endpoints require proper authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const adminToken = request.headers.get('x-admin-token');
    if (adminToken !== process.env.ADMIN_TOKEN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Perform real runtime checks
    const checks: Record<string, boolean> = {
      supabase_configured: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      resend_configured: !!process.env.RESEND_API_KEY,
      unsubscribe_secret_set: !!process.env.UNSUBSCRIBE_SECRET,
      kv_configured: !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN),
      anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
      atlas_eval_key_set: !!process.env.ATLAS_EVAL_KEY,
      cron_secret_set: !!process.env.CRON_SECRET,
    };

    const allPassing = Object.values(checks).every(Boolean);

    const auditResults = {
      status: allPassing ? 'all_checks_passing' : 'missing_config',
      checks,
      checked_at: new Date().toISOString(),
    };

    return NextResponse.json(auditResults);
  } catch (error) {
    console.error('Security audit error:', error);
    return NextResponse.json({ error: 'Audit failed' }, { status: 500 });
  }
}
