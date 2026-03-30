import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * DELETE /api/auth/delete-account
 * Deletes user account and all associated data (GDPR/CCPA compliance)
 * Requires authentication token
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
    if (!authHeader) {
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
