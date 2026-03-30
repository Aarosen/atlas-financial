import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/goals/save
 * Save or update a goal in the user_goals table
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, goal } = await request.json();

    if (!userId || userId === 'guest' || !goal) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Validate goal_type against schema CHECK constraint
    const validGoalTypes = ['emergency_fund', 'debt_payoff', 'savings_target', 'invest_start', 'other'];
    if (!validGoalTypes.includes(goal.goal_type)) {
      goal.goal_type = 'other';
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
        console.warn('[goals-save] Supabase not configured');
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
      console.warn('[goals-save] Supabase not configured');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if goal of this type already exists for this user
    const { data: existing, error: checkError } = await supabase
      .from('user_goals')
      .select('id')
      .eq('user_id', userId)
      .eq('goal_type', goal.goal_type)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('[goals-save] Error checking existing goal:', checkError);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    let data, error;

    if (existing) {
      // Update existing goal
      const { data: updated, error: updateError } = await supabase
        .from('user_goals')
        .update({
          goal_label: goal.goal_label || goal.title,
          description: goal.description,
          target_amount: goal.target_amount,
          target_date: goal.target_date,
          status: goal.status || 'active',
        })
        .eq('id', existing.id)
        .select();

      data = updated;
      error = updateError;
    } else {
      // Insert new goal
      const { data: inserted, error: insertError } = await supabase
        .from('user_goals')
        .insert({
          user_id: userId,
          goal_type: goal.goal_type,
          goal_label: goal.goal_label || goal.title,
          description: goal.description,
          target_amount: goal.target_amount,
          starting_amount: 0,
          target_date: goal.target_date,
          status: goal.status || 'active',
          created_at: new Date().toISOString(),
        })
        .select();

      data = inserted;
      error = insertError;
    }

    if (error) {
      console.error('[goals-save] Error saving goal:', error);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true, goal: data }, { status: 200 });
  } catch (error) {
    console.error('[goals-save] Error:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
