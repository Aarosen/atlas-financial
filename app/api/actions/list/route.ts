import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for fetching user's action pipeline
 * Called to populate action pipeline visualization
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const status = searchParams.get('status'); // 'recommended', 'committed', 'completed', etc.

    if (!userId || userId === 'guest') {
      return NextResponse.json(
        { ok: true, actions: [] },
        { status: 200 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[actions] Supabase not configured');
      return NextResponse.json(
        { ok: true, actions: [] },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Build query
    let query = supabase
      .from('user_actions')
      .select('id, action_text, status, check_in_due_at, target_amount, target_frequency, recommended_at, committed_at, completion_verified_at')
      .eq('user_id', userId);

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    } else {
      // Default: show recommended and committed actions
      query = query.in('status', ['recommended', 'committed']);
    }

    const { data: actions, error } = await query
      .order('check_in_due_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[actions] Error fetching actions:', error);
      return NextResponse.json(
        { ok: true, actions: [] },
        { status: 200 }
      );
    }

    // Format actions for display
    const formattedActions = (actions || []).map((action: any) => ({
      id: action.id,
      text: action.action_text,
      status: action.status,
      dueDate: action.check_in_due_at ? new Date(action.check_in_due_at).toLocaleDateString() : 'No due date',
      amount: action.target_amount ? `$${action.target_amount.toLocaleString()}` : null,
      frequency: action.target_frequency,
      isOverdue: action.check_in_due_at ? new Date(action.check_in_due_at) < new Date() : false,
    }));

    return NextResponse.json(
      {
        ok: true,
        actions: formattedActions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[actions] Error:', error);
    return NextResponse.json(
      { ok: true, actions: [] },
      { status: 200 }
    );
  }
}
