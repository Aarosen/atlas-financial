import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/api/rateLimit';

/**
 * API endpoint for fetching user's conversation history
 * Called to populate session history sidebar
 * SECURITY: Verifies session token matches requested userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Check rate limit
    const clientId = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const isAuthenticated = !!request.headers.get('authorization');
    const { allowed } = checkRateLimit(clientId, isAuthenticated);
    
    if (!allowed) {
      return new Response('Too many requests', { 
        status: 429, 
        headers: getRateLimitHeaders(clientId, isAuthenticated) 
      });
    }

    // Verify session token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      // Allow guest access without token
      if (!userIdParam || userIdParam === 'guest') {
        return NextResponse.json(
          { ok: true, conversations: [] },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[conversations] Supabase not configured');
      return NextResponse.json(
        { ok: true, conversations: [] },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the requested userId matches the authenticated user
    if (userIdParam && userIdParam !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestedUserId = user.id;
    if (!requestedUserId || requestedUserId === 'guest') {
      return NextResponse.json(
        { ok: true, conversations: [] },
        { status: 200 }
      );
    }

    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceUrl || !supabaseServiceKey) {
      console.warn('[conversations] Supabase not configured');
      return NextResponse.json(
        { ok: true, conversations: [] },
        { status: 200 }
      );
    }

    const supabaseService = createClient(supabaseServiceUrl, supabaseServiceKey);

    // Query conversations table for user's recent conversations
    const { data: conversations, error } = await supabaseService
      .from('conversations')
      .select('id, user_id, started_at, topic, turn_count, summary')
      .eq('user_id', requestedUserId)
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
