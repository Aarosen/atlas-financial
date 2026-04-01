import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/user/stats
 * Returns user statistics for milestone detection
 * Queries Supabase server-side to get actionsCompleted and daysSinceFirstMessage
 * Requires JWT authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get auth header to verify user is authenticated
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the token and ensure it belongs to the requesting user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabase.auth.getUser(token);
    
    if (authCheckError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Count completed actions
    const { data: actions, error: actionsError } = await supabase
      .from('user_actions')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'completed');

    if (actionsError) {
      console.error('[user-stats] Error fetching actions:', actionsError);
    }

    const actionsCompleted = actions?.length || 0;

    // Count all non-abandoned actions for follow-through rate calculation
    const { data: allActions, error: allActionsError } = await supabase
      .from('user_actions')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['recommended', 'committed', 'completed', 'partial', 'skipped']);

    if (allActionsError) {
      console.error('[user-stats] Error fetching all actions:', allActionsError);
    }

    const actionsTotal = allActions?.length || 0;

    // Calculate days since first message
    let daysSinceFirstMessage = 0;
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (messagesError) {
      console.error('[user-stats] Error fetching messages:', messagesError);
    } else if (messages && messages.length > 0) {
      const firstMessageDate = new Date(messages[0].created_at);
      const now = new Date();
      daysSinceFirstMessage = Math.floor((now.getTime() - firstMessageDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json(
      {
        userId,
        actionsCompleted,
        actionsTotal,
        daysSinceFirstMessage,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[user-stats] Error fetching user stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user stats' },
      { status: 500 }
    );
  }
}
