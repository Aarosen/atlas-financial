import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for fetching pending action check-in
 * Called on session start to show ActionCompletionCard if user has overdue actions
 * SECURITY: Verifies Bearer token matches requested userId
 */
async function handlePendingActionsRequest(request: NextRequest, isGet: boolean = false) {
  try {
    let userId: string | null = null;
    let sessionId: string | null = null;

    if (isGet) {
      const { searchParams } = new URL(request.url);
      userId = searchParams.get('userId');
      sessionId = searchParams.get('sessionId');
    } else {
      const body = await request.json();
      userId = body.userId;
      sessionId = body.sessionId;
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
        console.warn('[actions] Supabase not configured');
        return NextResponse.json(
          { ok: true, action: null },
          { status: 200 }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Verify the requested userId matches the authenticated user
      if (userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!userId || userId === 'guest') {
      return NextResponse.json(
        { ok: true, action: null },
        { status: 200 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[companion] Supabase not configured - returning no pending actions');
      return NextResponse.json(
        { ok: true, action: null },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch most recent action that is due for check-in
    // Status: 'recommended' (Atlas suggested it) or 'committed' (user committed to it)
    // check_in_due_at: timestamp when user should be asked if they did it
    const { data: actions, error } = await supabase
      .from('user_actions')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['recommended', 'committed'])
      .lte('check_in_due_at', new Date().toISOString())
      .is('completed_at', null)
      .order('check_in_due_at', { ascending: true })
      .limit(1);

    if (error) {
      console.error('[companion] Error fetching pending actions:', error);
      return NextResponse.json(
        { ok: true, action: null },
        { status: 200 }
      );
    }

    const pendingAction = actions && actions.length > 0 ? actions[0] : null;

    if (pendingAction) {
      console.log('[companion] Pending action found for user:', {
        userId,
        actionId: pendingAction.id,
        actionText: pendingAction.action_text,
        dueAt: pendingAction.check_in_due_at,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        action: pendingAction ? {
          id: pendingAction.id,
          text: pendingAction.action_text,
          dueDate: pendingAction.check_in_due_at,
          type: pendingAction.action_type,
        } : null,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching pending actions:', error);
    return NextResponse.json(
      { ok: true, action: null },
      { status: 200 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePendingActionsRequest(request, true);
}

export async function POST(request: NextRequest) {
  return handlePendingActionsRequest(request, false);
}
