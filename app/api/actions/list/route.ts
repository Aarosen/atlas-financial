import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/api/rateLimit';

/**
 * API endpoint for fetching user's action pipeline
 * Called to populate action pipeline visualization
 * SECURITY: Verifies session token matches requested userId
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    const statusParam = searchParams.get('status'); // 'recommended', 'committed', 'completed', etc.

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
          { ok: true, actions: [] },
          { status: 200 }
        );
      }
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[actions] Supabase not configured');
      return NextResponse.json(
        { ok: true, actions: [] },
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
        { ok: true, actions: [] },
        { status: 200 }
      );
    }

    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceUrl || !supabaseServiceKey) {
      console.warn('[actions] Supabase not configured');
      return NextResponse.json(
        { ok: true, actions: [] },
        { status: 200 }
      );
    }

    const supabaseService = createClient(supabaseServiceUrl, supabaseServiceKey);

    // Build query
    let query = supabaseService
      .from('user_actions')
      .select('id, action_text, status, check_in_due_at, target_amount, target_frequency, recommended_at, committed_at, completion_verified_at')
      .eq('user_id', requestedUserId);

    // Filter by status if provided
    if (statusParam && typeof statusParam === 'string') {
      query = query.eq('status', statusParam);
    } else {
      // Default: show recommended and committed actions
      query = query.in('status', ['recommended', 'committed']);
    }

    const { data: actions, error } = await query
      .order('check_in_due_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('[actions] Error fetching actions:', error);
      return NextResponse.json(
        { ok: true, actions: [] },
        { status: 200 }
      );
    }

    // Format actions for display
    const formattedActions = (actions || []).map((action: any) => ({
      id: action.id,
      text: action.action_text,
      status: action.status,
      dueDate: action.check_in_due_at ? new Date(action.check_in_due_at).toLocaleDateString() : 'No due date',
      amount: action.target_amount ? `$${action.target_amount.toLocaleString()}` : null,
      frequency: action.target_frequency,
      isOverdue: action.check_in_due_at ? new Date(action.check_in_due_at) < new Date() : false,
    }));

    return NextResponse.json(
      {
        ok: true,
        actions: formattedActions,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[actions] Error:', error);
    return NextResponse.json(
      { ok: true, actions: [] },
      { status: 200 }
    );
  }
}
