/**
 * Email notification service
 * Handles sending emails via Resend for various Atlas events
 */

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface OverdueCommitmentEmail {
  email: string;
  commitments: Array<{
    title: string;
    daysOverdue: number;
    dueDate: string;
  }>;
}

export interface ProactiveNudgeEmail {
  email: string;
  nudgeType: 'milestone' | 'goal_progress' | 'phase_complete' | 'action_reminder';
  title: string;
  message: string;
  actionUrl: string;
}

/**
 * Build overdue commitment email template
 */
export function buildOverdueCommitmentEmail(data: OverdueCommitmentEmail): EmailTemplate {
  const { email, commitments } = data;
  const count = commitments.length;

  const commitmentsList = commitments
    .map((c) => `<li><strong>${c.title}</strong> - ${c.daysOverdue} days overdue</li>`)
    .join('');

  const subject = `You have ${count} overdue financial commitment${count > 1 ? 's' : ''}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .commitment-list { list-style: none; padding: 0; }
          .commitment-list li { padding: 10px; background: white; margin-bottom: 10px; border-left: 4px solid #667eea; }
          .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Overdue Commitments</h2>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            <p>You have <strong>${count} overdue financial commitment${count > 1 ? 's' : ''}</strong> that need your attention:</p>
            
            <ul class="commitment-list">
              ${commitmentsList}
            </ul>
            
            <p>These commitments are important for your financial progress. Let's get back on track together.</p>
            
            <a href="https://atlas.financial/conversation" class="cta">Update Your Progress</a>
          </div>
          
          <div class="footer">
            <p>Atlas Financial • Your personal financial companion</p>
            <p><a href="https://atlas.financial/preferences">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
You have ${count} overdue financial commitment${count > 1 ? 's' : ''}:

${commitments.map((c) => `- ${c.title} (${c.daysOverdue} days overdue)`).join('\n')}

These commitments are important for your financial progress. Let's get back on track together.

Log in to Atlas to update your progress: https://atlas.financial/conversation

Atlas Financial • Your personal financial companion
  `.trim();

  return { subject, html, text };
}

/**
 * Build proactive nudge email template
 */
export function buildProactiveNudgeEmail(data: ProactiveNudgeEmail): EmailTemplate {
  const { email, nudgeType, title, message, actionUrl } = data;

  const nudgeEmojis = {
    milestone: '🎉',
    goal_progress: '📈',
    phase_complete: '✅',
    action_reminder: '⏰',
  };

  const emoji = nudgeEmojis[nudgeType];

  const subject = `${emoji} ${title}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
          .header h2 { margin: 0; font-size: 24px; }
          .content { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
          .message { font-size: 16px; line-height: 1.8; margin: 15px 0; }
          .cta { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
          .footer { color: #999; font-size: 12px; text-align: center; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>${emoji} ${title}</h2>
          </div>
          
          <div class="content">
            <p>Hi there,</p>
            <div class="message">${message}</div>
            
            <a href="${actionUrl}" class="cta">View Details</a>
          </div>
          
          <div class="footer">
            <p>Atlas Financial • Your personal financial companion</p>
            <p><a href="https://atlas.financial/preferences">Manage notification preferences</a></p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
${title}

${message}

View details: ${actionUrl}

Atlas Financial • Your personal financial companion
  `.trim();

  return { subject, html, text };
}

/**
 * Send email via Resend
 */
export async function sendEmail(
  to: string,
  template: EmailTemplate,
  from: string = 'Atlas <notifications@atlas.financial>'
): Promise<boolean> {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.warn('[email] RESEND_API_KEY not configured');
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject: template.subject,
        html: template.html,
        text: template.text,
      }),
    });

    if (!response.ok) {
      console.error('[email] Error sending email:', response.statusText);
      return false;
    }

    console.log(`[email] Sent email to ${to}: ${template.subject}`);
    return true;
  } catch (error) {
    console.error('[email] Error:', error);
    return false;
  }
}

/**
 * Send overdue commitment notification
 */
export async function sendOverdueCommitmentEmail(data: OverdueCommitmentEmail): Promise<boolean> {
  const template = buildOverdueCommitmentEmail(data);
  return sendEmail(data.email, template);
}

/**
 * Send proactive nudge notification
 */
export async function sendProactiveNudgeEmail(data: ProactiveNudgeEmail): Promise<boolean> {
  const template = buildProactiveNudgeEmail(data);
  return sendEmail(data.email, template);
}
