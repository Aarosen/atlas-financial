import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/user/export
 * Exports all user data as JSON (GDPR right to data portability)
 * Requires authentication token
 */
export async function GET(request: NextRequest) {
  try {
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

    // Verify the token and extract userId
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authCheckError } = await supabase.auth.getUser(token);
    
    if (authCheckError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Fetch all user data
    const [
      goalsData,
      actionsData,
      snapshotsData,
      sessionsData,
      messagesData,
      profileData,
    ] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId),
      supabase.from('user_actions').select('*').eq('user_id', userId),
      supabase.from('financial_snapshots').select('*').eq('user_id', userId),
      supabase.from('conversation_sessions').select('*').eq('user_id', userId),
      supabase.from('conversation_messages').select('*').eq('user_id', userId),
      supabase.from('user_profiles').select('*').eq('user_id', userId),
    ]);

    // Check for errors
    if (
      goalsData.error ||
      actionsData.error ||
      snapshotsData.error ||
      sessionsData.error ||
      messagesData.error ||
      profileData.error
    ) {
      return NextResponse.json(
        { error: 'Failed to export data' },
        { status: 500 }
      );
    }

    // Compile export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId,
      email: user.email,
      profile: profileData.data || [],
      goals: goalsData.data || [],
      actions: actionsData.data || [],
      financialSnapshots: snapshotsData.data || [],
      conversationSessions: sessionsData.data || [],
      conversationMessages: messagesData.data || [],
    };

    // Return as JSON file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="atlas-data-export-${userId}-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    );
  }
}
