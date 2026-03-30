import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/goals/delete
 * Delete a goal from the user_goals table
 */
export async function DELETE(request: NextRequest) {
  try {
    const { goalId, userId } = await request.json();

    if (!goalId || !userId || userId === 'guest') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Verify Bearer token for authenticated users
    const authHeader = request.headers.get('Authorization');
    if (userId && userId !== 'guest') {
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[goals-delete] Supabase not configured');
        return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('[goals-delete] Supabase not configured');
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete the goal
    const { error } = await supabase
      .from('user_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      console.error('[goals-delete] Error deleting goal:', error);
      return NextResponse.json({ ok: false, error: 'Failed to delete goal' }, { status: 500 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[goals-delete] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
