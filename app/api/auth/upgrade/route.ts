import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for upgrading guest sessions to authenticated sessions
 * Called when a guest user authenticates via Magic Link
 * Migrates guest data to authenticated user account
 */
export async function POST(request: NextRequest) {
  try {
    const { guestSessionId, userId, token } = await request.json();

    if (!userId || !token) {
      return NextResponse.json(
        { error: 'Missing userId or token' },
        { status: 400 }
      );
    }

    // Verify the token
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[auth-upgrade] Supabase not configured');
      return NextResponse.json(
        { ok: true, upgraded: false },
        { status: 200 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseKey) {
      console.warn('[auth-upgrade] Service role key not configured');
      return NextResponse.json(
        { ok: true, upgraded: false },
        { status: 200 }
      );
    }

    const adminSupabase = createClient(supabaseUrl, supabaseKey);

    // If guest session ID provided, migrate guest data to authenticated user
    if (guestSessionId) {
      try {
        // Fetch guest conversation sessions
        const { data: guestSessions } = await adminSupabase
          .from('conversation_sessions')
          .select('*')
          .eq('user_id', guestSessionId);

        // Migrate sessions to authenticated user
        if (guestSessions && guestSessions.length > 0) {
          for (const session of guestSessions) {
            await adminSupabase
              .from('conversation_sessions')
              .update({ user_id: userId })
              .eq('id', session.id);
          }
        }

        // Fetch guest messages
        const { data: guestMessages } = await adminSupabase
          .from('conversation_messages')
          .select('*')
          .eq('user_id', guestSessionId);

        // Migrate messages to authenticated user
        if (guestMessages && guestMessages.length > 0) {
          for (const message of guestMessages) {
            await adminSupabase
              .from('conversation_messages')
              .update({ user_id: userId })
              .eq('id', message.id);
          }
        }

        // Fetch guest financial snapshots
        const { data: guestSnapshots } = await adminSupabase
          .from('financial_snapshots')
          .select('*')
          .eq('user_id', guestSessionId);

        // Migrate snapshots to authenticated user
        if (guestSnapshots && guestSnapshots.length > 0) {
          for (const snapshot of guestSnapshots) {
            await adminSupabase
              .from('financial_snapshots')
              .update({ user_id: userId })
              .eq('id', snapshot.id);
          }
        }

        // Fetch guest actions
        const { data: guestActions } = await adminSupabase
          .from('user_actions')
          .select('*')
          .eq('user_id', guestSessionId);

        // Migrate actions to authenticated user
        if (guestActions && guestActions.length > 0) {
          for (const action of guestActions) {
            await adminSupabase
              .from('user_actions')
              .update({ user_id: userId })
              .eq('id', action.id);
          }
        }
      } catch (migrationError) {
        console.error('[auth-upgrade] Error migrating guest data:', migrationError);
        // Continue even if migration fails
      }
    }

    return NextResponse.json(
      {
        ok: true,
        upgraded: true,
        userId,
        message: 'Guest session upgraded to authenticated account',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[auth-upgrade] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
