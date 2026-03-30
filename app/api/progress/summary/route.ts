import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

interface ProgressSnapshot {
  metric: string;
  previousValue: number;
  currentValue: number;
  unit: string;
  isPositive: boolean;
}

/**
 * API endpoint for fetching user progress summary
 * Called on session start to show returning users their progress
 * Closes the marathon gap by displaying concrete progress over time
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId } = await request.json();

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
        console.warn('[progress] Supabase not configured');
        return NextResponse.json(
          { ok: true, snapshots: [], daysSinceLast: 0 },
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
        { ok: true, snapshots: [], daysSinceLast: 0 },
        { status: 200 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[companion] Supabase not configured - returning empty progress');
      return NextResponse.json(
        { ok: true, snapshots: [], daysSinceLast: 0 },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query financial_snapshots for user's last two snapshots
    const { data: snapshots, error } = await supabase
      .from('financial_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('snapshot_date', { ascending: false })
      .limit(2);

    if (error) {
      console.error('[companion] Error fetching snapshots:', error);
      return NextResponse.json(
        { ok: true, snapshots: [], daysSinceLast: 0 },
        { status: 200 }
      );
    }

    // If we have at least 2 snapshots, calculate deltas
    const progressSnapshots: ProgressSnapshot[] = [];
    let daysSinceLast = 0;

    if (snapshots && snapshots.length >= 2) {
      const [current, previous] = snapshots;

      // Calculate days between snapshots with date validation
      const currentDate = new Date(current.snapshot_date);
      const previousDate = new Date(previous.snapshot_date);
      
      // Validate dates are valid
      if (!isNaN(currentDate.getTime()) && !isNaN(previousDate.getTime())) {
        daysSinceLast = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      } else {
        daysSinceLast = 0;
      }

      // High-interest debt delta
      if (current.total_debt !== null && previous.total_debt !== null) {
        const debtDown = previous.total_debt - current.total_debt;
        if (debtDown !== 0) {
          progressSnapshots.push({
            metric: 'High-interest debt',
            previousValue: previous.total_debt,
            currentValue: current.total_debt,
            unit: 'USD',
            isPositive: true, // true means improvement is when value goes down
          });
        }
      }

      // Savings delta
      if (current.total_savings !== null && previous.total_savings !== null) {
        const savingsUp = current.total_savings - previous.total_savings;
        if (savingsUp !== 0) {
          progressSnapshots.push({
            metric: 'Savings',
            previousValue: previous.total_savings,
            currentValue: current.total_savings,
            unit: 'USD',
            isPositive: false, // false means improvement is when value goes up
          });
        }
      }

      // Net worth delta
      if (current.net_worth !== null && previous.net_worth !== null) {
        const netWorthUp = current.net_worth - previous.net_worth;
        if (netWorthUp !== 0) {
          progressSnapshots.push({
            metric: 'Net worth',
            previousValue: previous.net_worth,
            currentValue: current.net_worth,
            unit: 'USD',
            isPositive: false,
          });
        }
      }

      console.log('[companion] Progress summary calculated for user:', {
        userId,
        daysSinceLast,
        metricsCount: progressSnapshots.length,
      });
    }

    return NextResponse.json(
      {
        ok: true,
        userId,
        sessionId,
        snapshots: progressSnapshots,
        daysSinceLast,
        message: progressSnapshots.length > 0 ? 'Progress data fetched successfully' : 'No progress data available yet',
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
