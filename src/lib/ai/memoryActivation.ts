import { ConversationSession, UserAction } from '@/lib/db/supabaseRepository';
import { Anthropic } from '@anthropic-ai/sdk';

const client = new Anthropic();

/**
 * Extract key decisions from a conversation at session end
 * Called when session ends to capture what the user decided
 */
export async function extractKeyDecisions(
  conversationText: string,
  apiKey: string
): Promise<string[]> {
  const extractionPrompt = `Given this financial conversation, what key financial decisions did the user make or commit to?
Return a JSON array of strings, max 3 items.

Conversation:
"""
${conversationText}
"""

Example output:
["Committed to $1,800/month automatic transfer", "Decided to use avalanche debt strategy", "Agreed to cancel gym membership"]

If no key decisions, return [].

Return ONLY the JSON array, no other text.`;

  try {
    const response = await client.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: extractionPrompt,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error extracting key decisions:', error);
    return [];
  }
}

/**
 * Determine if follow-up is needed based on session actions
 * Called at session end to set follow_up_needed flag
 */
export function determineFollowUpNeeded(actions: UserAction[]): boolean {
  // Follow-up is needed if there are any committed or recommended actions
  return actions.some((a) => a.status === 'committed' || a.status === 'recommended');
}

/**
 * Generate follow-up notes based on open actions
 * Called at session end to provide context for next session
 */
export function generateFollowUpNotes(actions: UserAction[]): string | null {
  const openActions = actions.filter((a) => a.status === 'committed' || a.status === 'recommended');

  if (openActions.length === 0) {
    return null;
  }

  let notes = 'Open commitments to follow up on:\n';
  openActions.forEach((action, index) => {
    notes += `${index + 1}. ${action.action_text}\n`;
  });

  return notes;
}

/**
 * Build memory summary from recent sessions
 * Called at session start to provide context about user's history
 */
export function buildMemorySummary(recentSessions: ConversationSession[]): string | null {
  if (recentSessions.length === 0) {
    return null;
  }

  let summary = 'Recent conversation history:\n\n';

  recentSessions.forEach((session, index) => {
    const sessionDate = new Date(session.started_at).toLocaleDateString();
    summary += `Session ${index + 1} (${sessionDate}):\n`;

    if (session.primary_topic) {
      summary += `  Topic: ${session.primary_topic}\n`;
    }

    if (session.session_goal) {
      summary += `  Goal: ${session.session_goal}\n`;
    }

    if (session.key_decisions && session.key_decisions.length > 0) {
      summary += `  Decisions: ${session.key_decisions.join(', ')}\n`;
    }

    if (session.follow_up_needed && session.follow_up_notes) {
      summary += `  Follow-up: ${session.follow_up_notes}\n`;
    }

    summary += '\n';
  });

  return summary;
}

/**
 * Build learned insights from user's history
 * Captures patterns and insights about the user
 */
export function buildLearnedInsights(
  recentSessions: ConversationSession[],
  actions: UserAction[]
): string[] {
  const insights: string[] = [];

  // Analyze decision patterns
  const allDecisions = recentSessions
    .flatMap((s) => s.key_decisions || [])
    .filter((d) => d);

  if (allDecisions.length > 0) {
    insights.push(`User has made ${allDecisions.length} key financial decisions across sessions`);
  }

  // Analyze action patterns
  const completedActions = actions.filter((a) => a.status === 'completed' || a.status === 'partial');
  if (completedActions.length > 0) {
    insights.push(
      `User has completed or partially completed ${completedActions.length} recommended actions`
    );
  }

  // Analyze goal patterns
  const savingsActions = actions.filter((a) => a.action_category === 'savings');
  const debtActions = actions.filter((a) => a.action_category === 'debt_payoff');

  if (savingsActions.length > debtActions.length) {
    insights.push('User is more focused on savings goals than debt payoff');
  } else if (debtActions.length > savingsActions.length) {
    insights.push('User is prioritizing debt payoff');
  }

  return insights;
}

/**
 * Build outcomes summary from completed actions
 * Shows user the impact of their completed actions
 */
export function buildOutcomesSummary(completedActions: UserAction[]): string | null {
  if (completedActions.length === 0) {
    return null;
  }

  let summary = 'Completed actions and their impact:\n\n';

  let totalMonthlyImpact = 0;

  completedActions.forEach((action) => {
    summary += `✓ ${action.action_text}\n`;

    if (action.user_reported_outcome) {
      summary += `  User reported: ${action.user_reported_outcome}\n`;
    }

    if (action.actual_amount) {
      summary += `  Actual amount: $${action.actual_amount.toLocaleString()}\n`;
    }

    if (action.impact_per_month) {
      summary += `  Monthly impact: $${action.impact_per_month.toLocaleString()}\n`;
      totalMonthlyImpact += action.impact_per_month;
    }

    summary += '\n';
  });

  if (totalMonthlyImpact > 0) {
    summary += `Total monthly impact from completed actions: $${totalMonthlyImpact.toLocaleString()}\n`;
  }

  return summary;
}
