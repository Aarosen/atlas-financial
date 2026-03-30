import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PATCH /api/actions/update
 * Update action status (mark complete, dismiss, etc.)
 * Requires authentication
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { actionId, status } = body as { actionId?: string; status?: string };

    if (!actionId || !status) {
      return NextResponse.json(
        { error: 'Action ID and status are required' },
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

    // Update action status
    const { data, error } = await supabase
      .from('user_actions')
      .update({
        status,
        ...(status === 'completed' && { completion_verified_at: new Date().toISOString() }),
      })
      .eq('id', actionId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[actions/update] Error updating action:', error);
      return NextResponse.json(
        { error: 'Failed to update action' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: data,
    });
  } catch (error) {
    console.error('[actions/update] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
