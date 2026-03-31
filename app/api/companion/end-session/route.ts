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

    // Update session to mark as ended
    const { error: sessionError } = await supabase
      .from('conversation_sessions')
      .update({
        ended_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
          monthly_income: finalProfile.monthlyIncome || null,
          essential_expenses: finalProfile.essentialExpenses || null,
          total_savings: finalProfile.totalSavings || null,
          high_interest_debt: finalProfile.highInterestDebt || null,
          low_interest_debt: finalProfile.lowInterestDebt || null,
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
              action_text: action.title || action.action_text,
              action_category: action.category || 'general',
              status: action.status || 'pending',
              check_in_due_at: action.dueDate || action.check_in_due_at || null,
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
              turn_index: message.turn_index || 0,
              created_at: message.createdAt || new Date().toISOString(),
            },
            { onConflict: 'id' }
          );

        if (msgError) {
          console.error('[companion-end] Error saving message:', msgError);
        }
      }
    }

    return NextResponse.json(
      {
        ok: true,
        sessionEnded: true,
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
