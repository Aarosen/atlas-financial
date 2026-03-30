import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/goals/list
 * Fetch all goals for a user
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Guests have no goals
    if (!userId || userId === 'guest') {
      return NextResponse.json({ ok: true, goals: [] });
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

    // Verify JWT token matches requested userId
    const token = authHeader.slice(7);
    const { data: { user }, error: authCheckError } = await supabase.auth.getUser(token);
    if (authCheckError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch goals for user
    const { data: goals, error } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
      return NextResponse.json({ ok: true, goals: [] });
    }

    return NextResponse.json({ ok: true, goals: goals || [] });
  } catch (error) {
    console.error('Error in goals/list endpoint:', error);
    return NextResponse.json({ ok: true, goals: [] });
  }
}
