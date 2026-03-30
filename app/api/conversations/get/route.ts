import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for fetching a specific conversation session
 * Called when user clicks on a past conversation in the sidebar
 * Returns messages and metadata for that session
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'Missing sessionId or userId' },
        { status: 400 }
      );
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
        console.warn('[conversations] Supabase not configured');
        return NextResponse.json(
          { messages: [], sessionId, title: 'Conversation' },
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[conversations] Supabase not configured');
      return NextResponse.json(
        { messages: [], sessionId, title: 'Conversation' },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch conversation session metadata
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', userId)
      .single();

    if (sessionError || !session) {
      console.error('[conversations] Error fetching session:', sessionError);
      return NextResponse.json(
        { messages: [], sessionId, title: 'Conversation' },
        { status: 200 }
      );
    }

    // Fetch conversation messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('conversation_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('[conversations] Error fetching messages:', messagesError);
      return NextResponse.json(
        { messages: [], sessionId, title: session.title || 'Conversation' },
        { status: 200 }
      );
    }

    // Format messages for client consumption
    const formattedMessages = (messages || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
      created_at: msg.created_at,
    }));

    return NextResponse.json(
      {
        ok: true,
        sessionId,
        title: session.title || 'Conversation',
        messages: formattedMessages,
        created_at: session.created_at,
        updated_at: session.updated_at,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[conversations] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
