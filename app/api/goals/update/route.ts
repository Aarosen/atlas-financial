import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/goals/update
 * Update goal status (mark complete, pause, etc.)
 * Requires authentication
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { goalId, status } = body as { goalId?: string; status?: string };

    if (!goalId || !status) {
      return NextResponse.json(
        { error: 'Goal ID and status are required' },
        { status: 400 }
      );
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.slice(7);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify token and get user ID
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Update goal status
    const { data, error } = await supabase
      .from('user_goals')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...(status === 'completed' && { achieved_at: new Date().toISOString() }),
      })
      .eq('id', goalId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[goals/update] Error updating goal:', error);
      return NextResponse.json(
        { error: 'Failed to update goal' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      goal: data,
    });
  } catch (error) {
    console.error('[goals/update] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
