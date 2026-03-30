import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/actions/save
 * Save or update an action in the user_actions table
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, action } = await request.json();

    if (!userId || userId === 'guest' || !action) {
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
        console.error('[actions-save] Supabase not configured');
        return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });
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
      console.error('[actions-save] Supabase not configured');
      return NextResponse.json({ ok: false, error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fix 1: Ensure conversation session exists before inserting action (FK constraint)
    // Actions can be detected in messages 1-4, but sessions are only created at message 5
    if (sessionId) {
      const { data: existingSession } = await supabase
        .from('conversation_sessions')
        .select('id')
        .eq('id', sessionId)
        .maybeSingle();

      if (!existingSession) {
        // Auto-create session if it doesn't exist yet
        await supabase.from('conversation_sessions').insert({
          id: sessionId,
          user_id: userId,
          created_at: new Date().toISOString(),
        });
      }
    }

    // Insert action into user_actions table
    const { data, error } = await supabase
      .from('user_actions')
      .insert({
        user_id: userId,
        session_id: sessionId,
        action_text: action.action_text,
        action_category: action.action_category || 'other',
        target_amount: action.target_amount,
        target_frequency: action.target_frequency,
        check_in_due_at: action.check_in_due_at,
        status: action.status || 'recommended',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('[actions-save] Error saving action:', error);
      return NextResponse.json({ ok: false, error: 'Failed to save action' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, action: data }, { status: 200 });
  } catch (error) {
    console.error('[actions-save] Error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
