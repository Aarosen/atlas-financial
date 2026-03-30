import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimitKv, getRateLimitHeaders } from '@/lib/api/rateLimitKv';

/**
 * DELETE /api/auth/delete-account
 * Deletes user account and all associated data (GDPR/CCPA compliance)
 * Requires authentication token
 * Rate limited: 3 requests per hour per userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Get auth header to verify user is authenticated
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize Supabase client with service role (required for admin operations)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the token and ensure it belongs to the user requesting deletion
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabase.auth.getUser(token);
    
    if (authCheckError || !user || user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Apply rate limiting: 3 requests per hour per userId
    const rateLimitKey = `delete-account:${userId}`;
    const rateLimitResult = await checkRateLimitKv(rateLimitKey, 'delete-account');
    
    if (!rateLimitResult.allowed) {
      const headers = getRateLimitHeaders(rateLimitResult);
      const retryAfterSeconds = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      
      return NextResponse.json(
        {
          error: 'rate_limited',
          message: `Account deletion is rate limited. Please try again in ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers,
        }
      );
    }

    // Delete all user data in order (respecting foreign key constraints)
    // 1. Delete conversation messages
    await supabase
      .from('conversation_messages')
      .delete()
      .eq('user_id', userId);

    // 2. Delete conversation sessions
    await supabase
      .from('conversation_sessions')
      .delete()
      .eq('user_id', userId);

    // 3. Delete user actions
    await supabase
      .from('user_actions')
      .delete()
      .eq('user_id', userId);

    // 4. Delete user goals
    await supabase
      .from('user_goals')
      .delete()
      .eq('user_id', userId);

    // 5. Delete financial snapshots
    await supabase
      .from('financial_snapshots')
      .delete()
      .eq('user_id', userId);

    // 6. Delete user profile
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    // 7. Delete from auth.users (this will cascade delete auth sessions)
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error('Error deleting auth user:', authError);
      return NextResponse.json(
        { error: 'Failed to delete authentication record' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, message: 'Account and all associated data deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
