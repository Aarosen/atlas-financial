/**
 * Next-session check-in capability
 * Detects overdue committed actions and initiates check-in conversation
 */

export interface CheckInItem {
  actionId: string;
  actionText: string;
  daysOverdue: number;
  committedAt: string;
  dueAt: string;
}

export interface CheckInContext {
  hasOverdueItems: boolean;
  items: CheckInItem[];
  checkInPrompt: string;
}

/**
 * Generate check-in prompt for overdue actions
 */
export function generateCheckInPrompt(items: CheckInItem[]): string {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    const item = items[0];
    const daysText = item.daysOverdue === 1 ? 'day' : 'days';
    return `Last time we talked, you were planning to ${item.actionText.toLowerCase()}. That was ${item.daysOverdue} ${daysText} ago — how's that going?`;
  }

  // Multiple items
  const itemsList = items.slice(0, 3).map((item) => `• ${item.actionText}`).join('\n');
  return `Last time we talked, you committed to a few things:\n\n${itemsList}\n\nHow are these coming along?`;
}

/**
 * Build check-in context from overdue actions
 */
export function buildCheckInContext(actions: any[]): CheckInContext {
  const now = new Date();
  const overdueItems: CheckInItem[] = [];

  for (const action of actions) {
    if (action.status === 'committed' && action.check_in_due_at) {
      const dueDate = new Date(action.check_in_due_at);
      if (dueDate < now) {
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        overdueItems.push({
          actionId: action.id,
          actionText: action.action_text,
          daysOverdue,
          committedAt: action.committed_at,
          dueAt: action.check_in_due_at,
        });
      }
    }
  }

  return {
    hasOverdueItems: overdueItems.length > 0,
    items: overdueItems.sort((a, b) => b.daysOverdue - a.daysOverdue),
    checkInPrompt: generateCheckInPrompt(overdueItems),
  };
}

/**
 * Format check-in context for system prompt injection
 */
export function formatCheckInContextBlock(context: CheckInContext): string {
  if (!context.hasOverdueItems) {
    return '';
  }

  return `[CHECK_IN_CONTEXT]
The user has ${context.items.length} overdue committed action(s). Your first message should naturally check in on these commitments before moving to new topics. Be warm and non-judgmental — people often have good reasons for delays.

Overdue items:
${context.items.map((item) => `- ${item.actionText} (${item.daysOverdue} days overdue)`).join('\n')}

Opening message: "${context.checkInPrompt}"
[/CHECK_IN_CONTEXT]`;
}

/**
 * Check if check-in is needed
 */
export function shouldInitiateCheckIn(lastSessionDate: string | null): boolean {
  if (!lastSessionDate) return false;

  const lastSession = new Date(lastSessionDate);
  const now = new Date();
  const daysSinceLastSession = Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24));

  // Only check in if at least 1 day has passed
  return daysSinceLastSession >= 1;
}
