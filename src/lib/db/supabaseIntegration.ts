import { loadUserContext, UserContext } from './userContext';
import {
  upsertFinancialProfile,
  createSnapshot,
  createConversationSession,
  updateConversationSession,
  FinancialSnapshot,
  ConversationSession,
} from './supabaseRepository';

/**
 * Initialize a new conversation session in Supabase
 * Called at the start of a new user session
 */
export async function initializeConversationSession(
  userId: string,
  entryPoint?: string
): Promise<ConversationSession> {
  return createConversationSession({
    user_id: userId,
    ended_at: null,
    primary_topic: null,
    key_decisions: [],
    follow_up_needed: false,
    follow_up_notes: null,
    turn_count: 0,
    session_goal: null,
    entry_point: entryPoint || null,
  });
}

/**
 * Persist financial data to Supabase after extraction
 * Called after financial data is extracted from user message
 */
export async function persistFinancialData(
  userId: string,
  extractedFields: Record<string, any>
): Promise<void> {
  if (Object.keys(extractedFields).length === 0) {
    return;
  }

  // Map extracted fields to financial profile schema
  const profileUpdate: Record<string, any> = {};

  if (extractedFields.monthlyIncome !== undefined) {
    profileUpdate.monthly_income = extractedFields.monthlyIncome;
  }
  if (extractedFields.essentialExpenses !== undefined) {
    profileUpdate.essential_expenses = extractedFields.essentialExpenses;
  }
  if (extractedFields.discretionaryExpenses !== undefined) {
    profileUpdate.discretionary_expenses = extractedFields.discretionaryExpenses;
  }
  if (extractedFields.totalSavings !== undefined) {
    profileUpdate.total_savings = extractedFields.totalSavings;
  }
  if (extractedFields.highInterestDebt !== undefined) {
    profileUpdate.high_interest_debt = extractedFields.highInterestDebt;
  }
  if (extractedFields.lowInterestDebt !== undefined) {
    profileUpdate.low_interest_debt = extractedFields.lowInterestDebt;
  }

  if (Object.keys(profileUpdate).length > 0) {
    await upsertFinancialProfile(userId, profileUpdate);
  }
}

/**
 * Create a financial snapshot at session end
 * Captures the user's financial state at a point in time
 */
export async function createSessionSnapshot(
  userId: string,
  sessionId: string,
  financialData: Record<string, any>
): Promise<FinancialSnapshot | null> {
  if (Object.keys(financialData).length === 0) {
    return null;
  }

  const snapshot = {
    user_id: userId,
    session_id: sessionId,
    snapshot_date: new Date().toISOString().split('T')[0],
    monthly_income: financialData.monthlyIncome || null,
    essential_expenses: financialData.essentialExpenses || null,
    total_savings: financialData.totalSavings || null,
    high_interest_debt: financialData.highInterestDebt || null,
    low_interest_debt: financialData.lowInterestDebt || null,
    net_worth:
      (financialData.totalSavings || 0) -
      (financialData.highInterestDebt || 0) -
      (financialData.lowInterestDebt || 0),
    monthly_surplus:
      (financialData.monthlyIncome || 0) -
      (financialData.essentialExpenses || 0) -
      (financialData.discretionaryExpenses || 0),
  };

  return createSnapshot(snapshot);
}

/**
 * End a conversation session and persist final state
 * Called when user closes conversation or session times out
 */
export async function endConversationSession(
  sessionId: string,
  updates: {
    key_decisions?: string[];
    follow_up_needed?: boolean;
    follow_up_notes?: string;
    turn_count?: number;
    session_goal?: string;
  }
): Promise<void> {
  await updateConversationSession(sessionId, {
    ended_at: new Date().toISOString(),
    ...updates,
  });
}

/**
 * Build accountability context block for system prompt
 * Injected when there are open commitments to follow up on
 */
export function buildAccountabilityBlock(
  openActions: any[]
): string | null {
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
    block += `  User committed on: ${new Date(action.committed_at || action.recommended_at).toLocaleDateString()}\n`;
    block += `  Status: ${action.status}\n`;
    block += `  Check-in instruction: Ask warmly and directly about this action.\n\n`;
  });

  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

/**
 * Build behavioral adaptation context for system prompt
 * Injected when user has sufficient history to profile behavior
 */
export function buildBehavioralAdaptationBlock(
  behaviorProfile: any
): string | null {
  if (!behaviorProfile || !behaviorProfile.behavior_profile_active) {
    return null;
  }

  const followThroughRate = (behaviorProfile.follow_through_rate * 100).toFixed(0);
  const tags = behaviorProfile.behavioral_tags || [];

  let block = '━━━ USER BEHAVIORAL PROFILE ━━━\n';
  block += `Follow-through rate: ${followThroughRate}% (${behaviorProfile.commitments_followed_through} of ${behaviorProfile.total_commitments} commitments completed)\n`;

  if (behaviorProfile.avg_session_gap_days) {
    block += `Session frequency: Returns every ~${Math.round(behaviorProfile.avg_session_gap_days)} days on average\n`;
  }

  if (behaviorProfile.avg_days_to_complete) {
    block += `Execution speed: ${behaviorProfile.avg_days_to_complete > 30 ? 'Slow' : behaviorProfile.avg_days_to_complete > 14 ? 'Moderate' : 'Fast'} (avg ${Math.round(behaviorProfile.avg_days_to_complete)} days from commit to completion)\n`;
  }

  if (tags.length > 0) {
    block += `Behavioral tags: [${tags.join(', ')}]\n`;
  }

  block += '\nADAPTATION RULES:\n';

  if (tags.includes('needs_strong_accountability')) {
    block += '- Recommend ONE action only. Never suggest alternatives or optional steps.\n';
    block += '- Use shorter check-in windows (14 days, not 30).\n';
    block += '- When following up on incomplete commitments: name the pattern directly and non-judgmentally.\n';
  } else if (tags.includes('reliable_executor')) {
    block += '- This user executes reliably. You can reference next steps proactively.\n';
    block += '- Longer-range planning is appropriate — they are ready to think 6–12 months ahead.\n';
    block += '- Tone can be more peer-level. Less coaching, more strategic partnership.\n';
  }

  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}
