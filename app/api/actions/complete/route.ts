import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for recording action completion
 * Called when user confirms they completed a commitment
 * Writes completion status to Supabase user_actions table
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, actionId, completed } = await request.json();

    if (!userId || !actionId) {
      return NextResponse.json(
        { ok: false, error: 'Missing required fields: userId, actionId' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[companion] Supabase not configured - action completion not persisted');
      return NextResponse.json(
        {
          ok: true,
          userId,
          actionId,
          completed,
          message: completed
            ? 'Action marked as complete. Great work!'
            : 'Action marked as incomplete. No judgment — let\'s adjust the plan.',
        },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update action record in Supabase
    const { error } = await supabase
      .from('user_actions')
      .update({
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        status: completed ? 'completed' : 'skipped',
      })
      .eq('id', actionId)
      .eq('user_id', userId);

    if (error) {
      console.error('[companion] Error updating action completion:', error);
      // Don't fail the response — just log and continue
    } else {
      console.log('[companion] Action completion recorded in Supabase:', {
        userId,
        actionId,
        completed,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        ok: true,
        userId,
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
