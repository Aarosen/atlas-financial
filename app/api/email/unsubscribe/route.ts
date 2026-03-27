import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Email unsubscribe endpoint
 * Allows users to opt out of email notifications via link in emails
 * Required by CAN-SPAM / CASL regulations
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const token = url.searchParams.get('token'); // For HMAC verification in production

    if (!userId) {
      return NextResponse.redirect(new URL('/conversation', request.url));
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase not configured for unsubscribe');
      return NextResponse.redirect(new URL('/conversation?unsubscribed=true', request.url));
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Set email_notifications = false for this user
    const { error } = await supabase
      .from('users')
      .update({ email_notifications: false })
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating user notification preference:', error);
    } else {
      console.log(`[email] User ${userId} unsubscribed from notifications`);
    }

    return NextResponse.redirect(new URL('/conversation?unsubscribed=true', request.url));
  } catch (error) {
    console.error('Error in unsubscribe endpoint:', error);
    return NextResponse.redirect(new URL('/conversation', request.url));
  }
}
