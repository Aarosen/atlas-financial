import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/profile/behavior
 * Update user behavior profile with real follow-through rates
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, pattern } = await request.json();

    if (!userId || userId === 'guest' || !pattern) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Verify Bearer token for authenticated users
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[behavior-profile] Supabase not configured');
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

    const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceUrl || !supabaseServiceKey) {
      console.warn('[behavior-profile] Supabase service not configured');
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const supabaseService = createClient(supabaseServiceUrl, supabaseServiceKey);

    // Upsert behavior profile with real data
    const { error } = await supabaseService
      .from('user_behavior_profiles')
      .upsert(
        {
          user_id: userId,
          follow_through_rate: pattern.followThroughRate || 0,
          commitment_rate: pattern.commitmentRate || 0,
          last_active_at: new Date().toISOString(),
          behavior_profile_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) {
      console.error('[behavior-profile] Error updating behavior profile:', error);
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error('[behavior-profile] Error:', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
