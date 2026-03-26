import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for recording action completion
 * Called when user confirms they completed a commitment
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, actionId, completed } = await request.json();

    if (!userId || !sessionId || !actionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: userId, sessionId, actionId' },
        { status: 400 }
      );
    }

    // Record action completion
    // In a full implementation, this would:
    // 1. Update the action record in Supabase with completion status
    // 2. Update user's action history and streak
    // 3. Trigger waterfall progression if action was blocking next step
    // 4. Record the completion timestamp for progress tracking

    console.log('[companion] Action completion recorded:', {
      userId,
      sessionId,
      actionId,
      completed,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json(
      {
        ok: true,
        userId,
        sessionId,
        actionId,
        completed,
        message: completed
          ? 'Action marked as complete. Great work!'
          : 'Action marked as incomplete. No judgment — let\'s adjust the plan.',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error recording action completion:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to record action completion' },
      { status: 500 }
    );
  }
}
