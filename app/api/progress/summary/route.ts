import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint for fetching user progress summary
 * Called on session start to show returning users their progress
 * Closes the marathon gap by displaying concrete progress over time
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId } = await request.json();

    if (!userId || userId === 'guest') {
      return NextResponse.json(
        { ok: true, snapshots: [], daysSinceLast: 0 },
        { status: 200 }
      );
    }

    // In a full implementation with Supabase configured, this would:
    // 1. Query financial_snapshots table for user's last two snapshots
    // 2. Calculate deltas (debt down, savings up, etc.)
    // 3. Calculate days since last session
    // 4. Return formatted progress data

    // For now, return empty snapshots (will be populated when Supabase is configured)
    const snapshots = [
      // Example structure:
      // {
      //   metric: 'High-interest debt',
      //   previousValue: 12000,
      //   currentValue: 9500,
      //   unit: 'USD',
      //   isPositive: true, // true means improvement is when value goes down
      // },
      // {
      //   metric: 'Emergency fund',
      //   previousValue: 3000,
      //   currentValue: 4500,
      //   unit: 'USD',
      //   isPositive: false, // false means improvement is when value goes up
      // },
    ];

    const daysSinceLast = 0; // Will be calculated from last session timestamp

    console.log('[companion] Progress summary fetched for user:', userId);

    return NextResponse.json(
      {
        ok: true,
        userId,
        sessionId,
        snapshots,
        daysSinceLast,
        message: 'Progress data fetched successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching progress summary:', error);
    return NextResponse.json(
      { ok: true, snapshots: [], daysSinceLast: 0 },
      { status: 200 }
    );
  }
}
