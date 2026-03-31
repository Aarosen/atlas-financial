import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { endCompanionSession } from '@/lib/ai/companionIntegration';

/**
 * POST /api/chat/finalize
 * Called when user closes conversation or navigates away
 * Persists session data: key decisions, financial snapshots, follow-up flags
 * Requires JWT authentication (except for guests)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId, conversationText, financialData } = body as {
      userId?: string;
      sessionId?: string;
      conversationText?: string;
      financialData?: Record<string, any>;
    };

    if (!userId || !sessionId) {
      return NextResponse.json(
        { error: 'userId and sessionId are required' },
        { status: 400 }
      );
    }

    // Verify JWT token for non-guest users
    if (userId !== 'guest') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        return NextResponse.json(
          { error: 'Server configuration error' },
          { status: 500 }
        );
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const token = authHeader.slice(7);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    // Call endCompanionSession to persist session data
    await endCompanionSession(userId, sessionId, conversationText || '', financialData || {});

    return NextResponse.json({
      success: true,
      message: 'Session finalized and data persisted',
      sessionId,
    });
  } catch (error) {
    console.error('Error finalizing session:', error);
    return NextResponse.json(
      { error: 'Failed to finalize session' },
      { status: 500 }
    );
  }
}
