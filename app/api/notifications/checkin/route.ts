import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API endpoint for sending email check-in notifications
 * Called to notify users about pending actions or milestones
 * SECURITY: Verifies Bearer token matches requested userId
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, actionId, actionTitle, dueDate, email } = await request.json();

    if (!userId || userId === 'guest') {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // Verify Bearer token for authenticated users
    const authHeader = request.headers.get('Authorization');
    if (userId && userId !== 'guest') {
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const token = authHeader.slice(7);
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[notifications-checkin] Supabase not configured');
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
    }

    // Build email content
    const subject = `Check-in: ${actionTitle}`;
    const dueDateStr = dueDate ? new Date(dueDate).toLocaleDateString() : 'soon';
    
    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #0d9488 0%, #06b6d4 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Atlas Financial</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Check-in Reminder</p>
        </div>
        
        <div style="background: white; padding: 40px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">Hi there,</p>
          
          <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">
            It's time to check in on your financial goal:
          </p>
          
          <div style="background: #f1f5f9; padding: 20px; border-left: 4px solid #0d9488; margin: 20px 0; border-radius: 4px;">
            <p style="color: #0d9488; font-weight: 600; margin: 0 0 10px 0; font-size: 18px;">${actionTitle}</p>
            <p style="color: #64748b; margin: 0; font-size: 14px;">Due: ${dueDateStr}</p>
          </div>
          
          <p style="color: #334155; font-size: 16px; margin: 20px 0;">
            Taking time to reflect on your progress helps you stay on track and celebrate wins along the way.
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://atlas.financial/conversation" style="background: #0d9488; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
              Check In Now
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 30px 0 0 0; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            Questions? Reply to this email or visit our help center.
          </p>
        </div>
        
        <div style="text-align: center; padding: 20px; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">© 2026 Atlas Financial. All rights reserved.</p>
        </div>
      </div>
    `;

    // Log notification (in production, would send via email service)
    console.log('[notifications-checkin] Check-in notification:', {
      userId,
      actionId,
      actionTitle,
      dueDate,
      email,
      timestamp: new Date().toISOString(),
    });

    // TODO: Integrate with Resend or SendGrid for actual email sending
    // For now, just log the notification

    return NextResponse.json(
      { ok: true, notificationSent: true },
      { status: 200 }
    );
  } catch (error) {
    console.error('[notifications-checkin] Error:', error);
    return NextResponse.json(
      { ok: true },
      { status: 200 }
    );
  }
}
