import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for auto-saving conversation messages
 * Called periodically during conversation to persist messages
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, sessionId, messages, context } = await request.json();

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
        console.warn('[memory-save] Supabase not configured');
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
      console.warn('[memory-save] Supabase not configured');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // FIX 3: Create conversation session before saving messages
    // Check if session exists, if not create it first
    const { data: existingSession } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (!existingSession) {
      // Create session if it doesn't exist - schema-compliant INSERT
      await supabase
        .from('conversation_sessions')
        .insert({
          id: sessionId,
          user_id: userId,
          started_at: new Date().toISOString(),
          turn_count: 0,
          created_at: new Date().toISOString(),
        });
    }

    // Save each message with turn_index
    if (messages && Array.isArray(messages)) {
      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        await supabase
          .from('conversation_messages')
          .upsert(
            {
              id: message.id || `msg_${Date.now()}_${i}`,
              session_id: sessionId,
              user_id: userId,
              role: message.r === 'u' ? 'user' : 'assistant',
              content: message.t,
              turn_index: i,
              created_at: message.createdAt || new Date().toISOString(),
            },
            { onConflict: 'id' }
          );
      }
    }

    return NextResponse.json(
      { ok: true, saved: messages?.length || 0 },
      { status: 200 }
    );
  } catch (error) {
    console.error('[memory-save] Error:', error);
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  }
}
