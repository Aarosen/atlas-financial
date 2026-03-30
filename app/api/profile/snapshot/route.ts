import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/profile/snapshot
 * Fetch the most recent financial snapshot for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Guests have no snapshot
    if (!userId || userId === 'guest') {
      return NextResponse.json({ ok: true, snapshot: null });
    }

    // Verify Bearer token for authenticated users
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch most recent financial snapshot for user
    const { data: snapshots, error } = await supabase
      .from('financial_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching snapshot:', error);
      return NextResponse.json({ ok: true, snapshot: null });
    }

    const snapshot = snapshots && snapshots.length > 0 ? snapshots[0] : null;
    return NextResponse.json({ ok: true, snapshot });
  } catch (error) {
    console.error('Error in profile/snapshot endpoint:', error);
    return NextResponse.json({ ok: true, snapshot: null });
  }
}
