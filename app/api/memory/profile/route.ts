import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for persisting financial profile across sessions
 * Called at session end to save user's financial snapshot
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, profile } = await request.json();

    if (!userId || userId === 'guest' || !profile) {
      return NextResponse.json({ ok: true }, { status: 200 });
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
        console.warn('[memory-profile] Supabase not configured');
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      if (userId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[memory-profile] Supabase not configured');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create financial snapshot
    const { error: snapshotError } = await supabase
      .from('financial_snapshots')
      .insert({
        user_id: userId,
        session_id: sessionId,
        snapshot_date: new Date().toISOString(),
        monthly_income: profile.monthlyIncome || null,
        essential_expenses: profile.essentialExpenses || null,
        total_savings: profile.totalSavings || null,
        high_interest_debt: profile.highInterestDebt || null,
        low_interest_debt: profile.lowInterestDebt || null,
        total_debt: (profile.highInterestDebt || 0) + (profile.lowInterestDebt || 0),
        net_worth: (profile.totalSavings || 0) - ((profile.highInterestDebt || 0) + (profile.lowInterestDebt || 0)),
        primary_goal: profile.primaryGoal || null,
        risk_tolerance: profile.riskTolerance || null,
        profile_data: profile,
      });

    if (snapshotError) {
      console.error('[memory-profile] Error creating snapshot:', snapshotError);
    }

    // Update user profile record
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          monthly_income: profile.monthlyIncome || null,
          essential_expenses: profile.essentialExpenses || null,
          total_savings: profile.totalSavings || null,
          high_interest_debt: profile.highInterestDebt || null,
          low_interest_debt: profile.lowInterestDebt || null,
          primary_goal: profile.primaryGoal || null,
          risk_tolerance: profile.riskTolerance || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (profileError) {
      console.error('[memory-profile] Error updating profile:', profileError);
    }

    return NextResponse.json(
      { ok: true, persisted: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[memory-profile] Error:', error);
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  }
}
