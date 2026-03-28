import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for fetching user's conversation history
 * Called to populate session history sidebar
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!userId || userId === 'guest') {
      return NextResponse.json(
        { ok: true, conversations: [] },
        { status: 200 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[conversations] Supabase not configured');
      return NextResponse.json(
        { ok: true, conversations: [] },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Query conversations table for user's recent conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('id, user_id, started_at, topic, turn_count, summary')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[conversations] Error fetching conversations:', error);
      return NextResponse.json(
        { ok: true, conversations: [] },
        { status: 200 }
      );
    }

    // Format conversations for display
    const formattedConversations = (conversations || []).map((conv: any) => ({
      id: conv.id,
      date: new Date(conv.started_at).toLocaleDateString(),
      topic: conv.topic || 'Financial conversation',
      turns: conv.turn_count || 0,
      summary: conv.summary || '',
    }));

    return NextResponse.json(
      {
        ok: true,
        conversations: formattedConversations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[conversations] Error:', error);
    return NextResponse.json(
      { ok: true, conversations: [] },
      { status: 200 }
    );
  }
}
