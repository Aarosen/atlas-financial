/**
 * Vercel Cron Job: Check for overdue commitments
 * Runs daily to detect commitments that are past their deadline
 * Triggers email notifications for users with overdue commitments
 * 
 * Cron schedule: 0 9 * * * (9 AM UTC daily)
 * 
 * Vercel Cron Job Configuration (vercel.json):
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-overdue-commitments",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */

import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

/**
 * Lazy-load Supabase client to avoid build-time errors
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(supabaseUrl, supabaseKey);
}

interface OverdueCommitment {
  id: string;
  userId: string;
  userEmail: string;
  commitmentTitle: string;
  dueDate: string;
  daysOverdue: number;
  commitmentDetails: string;
}

/**
 * Query for overdue commitments from Supabase
 */
async function getOverdueCommitments(): Promise<OverdueCommitment[]> {
  try {
    const supabase = getSupabaseClient();
    
    // Query user_actions table for overdue commitments
    // Status = 'committed' or 'recommended' and check_in_due_at < today
    const { data, error } = await supabase
      .from('user_actions')
      .select(`
        id,
        user_id,
        action_text,
        check_in_due_at,
        status,
        users(email)
      `)
      .eq('email_notifications', true)
      .in('status', ['committed', 'recommended'])
      .lt('check_in_due_at', new Date().toISOString().split('T')[0])
      .order('check_in_due_at', { ascending: true });

    if (error) {
      console.error('Error querying overdue commitments:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform data to OverdueCommitment format
    const overdue: OverdueCommitment[] = data
      .filter((action: any) => action.users?.email)
      .map((action: any) => {
        const dueDate = new Date(action.check_in_due_at);
        const today = new Date();
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        return {
          id: action.id,
          userId: action.user_id,
          userEmail: action.users.email,
          commitmentTitle: action.action_text,
          dueDate: action.check_in_due_at,
          daysOverdue,
          commitmentDetails: '',
        };
      });

    return overdue;
  } catch (error) {
    console.error('Error in getOverdueCommitments:', error);
    return [];
  }
}

/**
 * Group overdue commitments by user
 */
function groupByUser(commitments: OverdueCommitment[]): Map<string, OverdueCommitment[]> {
  const grouped = new Map<string, OverdueCommitment[]>();

  for (const commitment of commitments) {
    if (!grouped.has(commitment.userEmail)) {
      grouped.set(commitment.userEmail, []);
    }
    grouped.get(commitment.userEmail)!.push(commitment);
  }

  return grouped;
}

/**
 * Send email notification for overdue commitments
 */
async function sendOverdueNotification(email: string, commitments: OverdueCommitment[]): Promise<boolean> {
  try {
    // Use Resend API to send email
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return false;
    }

    const commitmentsList = commitments
      .map((c) => `- ${c.commitmentTitle} (${c.daysOverdue} days overdue)`)
      .join('\n');

    const emailBody = `
Hi there,

You have ${commitments.length} overdue financial commitment${commitments.length > 1 ? 's' : ''}:

${commitmentsList}

These commitments are important for your financial progress. Let's get back on track together.

Log in to Atlas to update your progress or adjust your timeline.

Best,
Atlas
    `.trim();

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: 'Atlas <notifications@atlas.financial>',
        to: email,
        subject: `You have ${commitments.length} overdue financial commitment${commitments.length > 1 ? 's' : ''}`,
        html: `
          <h2>Overdue Commitments</h2>
          <p>Hi there,</p>
          <p>You have ${commitments.length} overdue financial commitment${commitments.length > 1 ? 's' : ''}:</p>
          <ul>
            ${commitments.map((c) => `<li>${c.commitmentTitle} (${c.daysOverdue} days overdue)</li>`).join('')}
          </ul>
          <p>These commitments are important for your financial progress. Let's get back on track together.</p>
          <p><a href="https://atlas.financial/conversation">Log in to Atlas</a> to update your progress or adjust your timeline.</p>
          <p>Best,<br/>Atlas</p>
        `,
      }),
    });

    if (!response.ok) {
      console.error('Error sending email via Resend:', response.statusText);
      return false;
    }

    console.log(`[cron] Sent overdue notification to ${email}`);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

/**
 * Log cron job execution for monitoring
 */
async function logCronExecution(status: 'success' | 'error', details: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.from('cron_logs').insert({
      job_name: 'check-overdue-commitments',
      status,
      details,
      executed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error logging cron execution:', error);
  }
}

/**
 * Main cron job handler
 */
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Vercel
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    console.log('[cron] Starting overdue commitment check');

    // Get all overdue commitments
    const overdueCommitments = await getOverdueCommitments();
    console.log(`[cron] Found ${overdueCommitments.length} overdue commitments`);

    if (overdueCommitments.length === 0) {
      await logCronExecution('success', 'No overdue commitments found');
      return new Response(JSON.stringify({ message: 'No overdue commitments', count: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Group by user and send notifications
    const groupedByUser = groupByUser(overdueCommitments);
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const [email, commitments] of groupedByUser) {
      const success = await sendOverdueNotification(email, commitments);
      if (success) {
        emailsSent++;
      } else {
        emailsFailed++;
      }
    }

    const details = `Processed ${overdueCommitments.length} overdue commitments. Emails sent: ${emailsSent}, failed: ${emailsFailed}`;
    await logCronExecution('success', details);

    console.log(`[cron] Completed: ${details}`);

    return new Response(
      JSON.stringify({
        message: 'Overdue commitment check completed',
        overdueCount: overdueCommitments.length,
        emailsSent,
        emailsFailed,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[cron] Error in overdue commitment check:', error);
    await logCronExecution('error', String(error));

    return new Response(
      JSON.stringify({
        error: 'Failed to check overdue commitments',
        details: String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
