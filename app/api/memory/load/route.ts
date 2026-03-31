import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/memory/load
 * Loads user's prior session context for AI memory
 * Queries Supabase for financial snapshots, goals, and conversation history
 * Requires JWT authentication
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionId = searchParams.get('sessionId');

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

    // Fetch most recent financial snapshot
    const { data: snapshots, error: snapshotError } = await supabase
      .from('financial_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (snapshotError) {
      console.error('[memory-load] Error fetching snapshots:', snapshotError);
    }

    const latestSnapshot = snapshots?.[0] || null;

    // Fetch active user goals
    const { data: goals, error: goalsError } = await supabase
      .from('user_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (goalsError) {
      console.error('[memory-load] Error fetching goals:', goalsError);
    }

    // Fetch most recent conversation session (excluding current session if sessionId provided)
    const { data: sessions, error: sessionsError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(2); // Get 2 to skip current session if needed

    if (sessionsError) {
      console.error('[memory-load] Error fetching sessions:', sessionsError);
    }

    // Find prior session (not the current one)
    let priorSession = null;
    if (sessions && sessions.length > 0) {
      if (sessionId && sessions.length > 1) {
        // Skip current session, use the one before it
        priorSession = sessions[1];
      } else if (!sessionId) {
        // No current session ID, use the most recent
        priorSession = sessions[0];
      }
    }

    // Fetch messages from prior session if it exists
    let priorMessages: any[] = [];
    if (priorSession) {
      const { data: messages, error: messagesError } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', priorSession.id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('[memory-load] Error fetching messages:', messagesError);
      } else {
        priorMessages = messages || [];
      }
    }

    // Build memory context object
    const memoryContext = {
      userId,
      lastSessionId: priorSession?.id || null,
      primaryGoal: priorSession?.metadata?.primaryGoal || null,
      financialSnapshot: latestSnapshot ? {
        monthlyIncome: latestSnapshot.monthly_income,
        essentialExpenses: latestSnapshot.essential_expenses,
        totalSavings: latestSnapshot.total_savings,
        highInterestDebt: latestSnapshot.high_interest_debt,
        lowInterestDebt: latestSnapshot.low_interest_debt,
        createdAt: latestSnapshot.created_at,
      } : null,
      activeGoals: goals?.map((g: any) => ({
        id: g.id,
        title: g.title,
        type: g.type,
        targetAmount: g.target_amount,
        currentAmount: g.current_amount,
        status: g.status,
      })) || [],
      priorConversationCount: priorMessages.length,
      lastInteractionAt: priorSession?.created_at || null,
    };

    return NextResponse.json(memoryContext, { status: 200 });
  } catch (error) {
    console.error('[memory-load] Error loading memory:', error);
    return NextResponse.json(
      { error: 'Failed to load memory' },
      { status: 500 }
    );
  }
}
