import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for ending companion sessions
 * Finalizes session, saves progress, and triggers follow-up actions
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, finalProfile, actions, messages } = await request.json();

    if (!userId || userId === 'guest' || !sessionId) {
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
        console.warn('[companion-end] Supabase not configured');
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
      console.warn('[companion-end] Supabase not configured');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update session status to completed
    const { error: sessionError } = await supabase
      .from('conversation_sessions')
      .update({
        status: 'completed',
        ended_at: new Date().toISOString(),
        final_profile: finalProfile || {},
      })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (sessionError) {
      console.error('[companion-end] Error updating session:', sessionError);
    }

    // Save final financial snapshot
    if (finalProfile) {
      const { error: snapshotError } = await supabase
        .from('financial_snapshots')
        .insert({
          user_id: userId,
          session_id: sessionId,
          snapshot_date: new Date().toISOString(),
          monthly_income: finalProfile.monthlyIncome || null,
          essential_expenses: finalProfile.essentialExpenses || null,
          total_savings: finalProfile.totalSavings || null,
          high_interest_debt: finalProfile.highInterestDebt || null,
          low_interest_debt: finalProfile.lowInterestDebt || null,
          total_debt: (finalProfile.highInterestDebt || 0) + (finalProfile.lowInterestDebt || 0),
          net_worth: (finalProfile.totalSavings || 0) - ((finalProfile.highInterestDebt || 0) + (finalProfile.lowInterestDebt || 0)),
          primary_goal: finalProfile.primaryGoal || null,
          risk_tolerance: finalProfile.riskTolerance || null,
          profile_data: finalProfile,
        });

      if (snapshotError) {
        console.error('[companion-end] Error saving snapshot:', snapshotError);
      }
    }

    // Save pending actions for next session
    if (actions && Array.isArray(actions)) {
      for (const action of actions) {
        const { error: actionError } = await supabase
          .from('user_actions')
          .upsert(
            {
              id: action.id || `action_${Date.now()}_${Math.random()}`,
              user_id: userId,
              session_id: sessionId,
              title: action.title,
              description: action.description,
              status: action.status || 'pending',
              due_date: action.dueDate || null,
              created_at: action.createdAt || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (actionError) {
          console.error('[companion-end] Error saving action:', actionError);
        }
      }
    }

    // Save conversation messages
    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        const { error: msgError } = await supabase
          .from('conversation_messages')
          .upsert(
            {
              id: message.id || `msg_${Date.now()}_${Math.random()}`,
              session_id: sessionId,
              user_id: userId,
              role: message.r === 'u' ? 'user' : 'assistant',
              content: message.t,
              created_at: message.createdAt || new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (msgError) {
          console.error('[companion-end] Error saving message:', msgError);
        }
      }
    }

    // Schedule follow-up check-in (24 hours from now)
    const checkInTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: checkInError } = await supabase
      .from('user_checkins')
      .insert({
        user_id: userId,
        session_id: sessionId,
        scheduled_for: checkInTime,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (checkInError) {
      console.error('[companion-end] Error scheduling check-in:', checkInError);
    }

    return NextResponse.json(
      {
        ok: true,
        sessionEnded: true,
        nextCheckIn: checkInTime,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[companion-end] Error:', error);
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  }
}
