import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';

/**
 * Email unsubscribe endpoint
 * Allows users to opt out of email notifications via link in emails
 * Required by CAN-SPAM / CASL regulations
 * SECURITY: Validates HMAC token to prevent unsubscribe sabotage attacks
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const token = url.searchParams.get('token');

    if (!userId || !token) {
      return NextResponse.redirect(new URL('/conversation', request.url));
    }

    // Validate HMAC token
    const unsubscribeSecret = process.env.UNSUBSCRIBE_SECRET;
    if (!unsubscribeSecret) {
      console.warn('UNSUBSCRIBE_SECRET not configured');
      return NextResponse.redirect(new URL('/conversation', request.url));
    }

    const expectedToken = createHmac('sha256', unsubscribeSecret)
      .update(userId)
      .digest('hex');

    if (token !== expectedToken) {
      console.warn(`[email] Invalid unsubscribe token for userId ${userId}`);
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 400 }
      );
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
      .eq('id', userId);

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
