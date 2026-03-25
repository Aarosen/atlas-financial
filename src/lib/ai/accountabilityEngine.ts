import { UserAction } from '@/lib/db/supabaseRepository';

/**
 * Build accountability context block for system prompt
 * Injected when there are open commitments to follow up on
 */
export function buildAccountabilityBlock(openActions: UserAction[]): string | null {
  if (openActions.length === 0) {
    return null;
  }

  let block = '━━━ OPEN COMMITMENTS — FOLLOW UP REQUIRED ━━━\n';
  block += 'The following actions were recommended and committed to but not yet verified as complete.\n';
  block += 'Address EVERY item below before moving to any new topic. Do not skip. Do not combine into one sentence.\n\n';

  openActions.forEach((action, index) => {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(action.check_in_due_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    block += `COMMITMENT ${index + 1}${daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ''}:\n`;
    block += `  Action: ${action.action_text}\n`;
    block += `  Category: ${action.action_category}\n`;
    if (action.target_amount) {
      block += `  Target amount: $${action.target_amount.toLocaleString()}\n`;
    }
    if (action.target_frequency) {
      block += `  Frequency: ${action.target_frequency}\n`;
    }
    block += `  User committed on: ${new Date(action.committed_at || action.recommended_at).toLocaleDateString()}\n`;
    block += `  Status: ${action.status}\n`;
    block += `  Check-in instruction: Ask warmly and directly about this action.\n`;
    block += `  If done → celebrate specifically, update their progress, move forward\n`;
    block += `  If not done → do NOT lecture. Ask what got in the way. Then simplify or re-sequence.\n`;
    block += `  If partial → acknowledge the partial win, understand the gap, reframe the remainder.\n\n`;
  });

  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

/**
 * Add Rule 8 to system prompt for accountability
 */
export const ACCOUNTABILITY_RULE = `RULE 8 — ACCOUNTABILITY BEFORE ADVICE.
If OPEN COMMITMENTS are present in the session state block, your FIRST response must address
them — ALL of them — before introducing any new topic or advice. Do not mention new analysis,
new recommendations, or new topics until you have checked in on every open commitment and
received the user's response. This is non-negotiable. It is the difference between a tool
and a companion.`;

/**
 * Detect if user is in accountability response mode
 * Returns context for how to handle the response
 */
export function buildAccountabilityResponseContext(
  action: UserAction,
  userResponse: string
): string {
  let context = `PHASE: ACCOUNTABILITY_RESPONSE\n`;
  context += `Context: User just responded to a check-in on their "${action.action_text}" commitment.\n`;
  context += `Original commitment: ${action.action_text}\n`;
  context += `User response: "${userResponse}"\n\n`;

  context += `Rule: Acknowledge the response appropriately:\n`;
  context += `- If completed: celebrate specifically with the dollar amount and impact\n`;
  context += `- If partial: acknowledge the partial win, understand the constraint, adjust the plan\n`;
  context += `- If not done: ask what got in the way, then adapt the strategy\n`;
  context += `Do NOT express disappointment. Do NOT re-explain why the action matters.\n`;
  context += `Ask clarifying questions to understand the situation, then adjust.\n`;

  return context;
}
