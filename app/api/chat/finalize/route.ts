import { NextRequest, NextResponse } from 'next/server';
import { endCompanionSession } from '@/lib/ai/companionIntegration';

/**
 * POST /api/chat/finalize
 * Called when user closes conversation or navigates away
 * Persists session data: key decisions, financial snapshots, follow-up flags
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
