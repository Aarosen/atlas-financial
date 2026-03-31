/**
 * Conversation goal wiring
 * Connects goal detection to addNewGoal calls and persists financial profile
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';
import { detectGoalsFromMessage } from './goalDetection';
import { checkMilestonesAfterGoalCreation } from '@/lib/celebrations/midSessionMilestoneDetection';

/**
 * Process assistant response for goals and trigger addNewGoal if detected
 */
export async function processResponseForGoals(
  response: string,
  addNewGoal: (goal: FinancialGoal) => void,
  userId?: string,
  token?: string,
  apiKey?: string,
  financialProfile?: Record<string, any>
): Promise<void> {
  try {
    // Use regex-based detection (fast fallback) instead of AI extraction
    // to avoid async complexity in this context
    const detectedGoals = await detectGoalsFromMessage(response, undefined);
    for (const goal of detectedGoals) {
      // Point 1: Only add goal to UI after successful save (prevents ghost goals)
      // FIX 4: Wire goal persistence to user_goals table
      if (userId && userId !== 'guest') {
        try {
          const saveResponse = await fetch('/api/goals/save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              userId,
              goal: {
                goal_type: goal.type,
                description: goal.description,
                target_amount: goal.targetAmount,
                target_date: goal.deadline,
                status: goal.status || 'active',
              },
            }),
            keepalive: true,
          });

          // Gap 7: Check for save errors and throw if failed
          if (!saveResponse.ok) {
            const data = await saveResponse.json();
            throw new Error(data.error || `Failed to save goal: ${saveResponse.status}`);
          }

          // Only add goal to UI after successful save
          addNewGoal(goal);

          // Gap 2a: Check for milestones after successful goal creation
          try {
            await checkMilestonesAfterGoalCreation(userId, detectedGoals.length, financialProfile, token);
          } catch (milestoneError) {
            console.warn('[goal-wiring] Milestone check failed (non-fatal):', milestoneError);
          }
        } catch (error) {
          console.error('Error persisting goal to database:', error);
          throw error;
        }
      } else {
        // For guest users, add goal to UI immediately (no persistence)
        addNewGoal(goal);
      }
    }
  } catch (error) {
    console.error('Error processing response for goals:', error);
  }
}

/**
 * Persist financial profile to Supabase at session end
 */
export async function persistFinancialProfile(
  userId: string,
  sessionId: string,
  financialData: Record<string, any>,
  conversationText: string
): Promise<void> {
  if (!userId || userId === 'guest') {
    return;
  }

  try {
    const response = await fetch('/api/profile/persist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        sessionId,
        financialData,
        conversationText,
      }),
      keepalive: true,
    });

    if (!response.ok) {
      console.error('Error persisting financial profile:', response.status);
      return;
    }

    console.log('[companion] Financial profile persisted');
  } catch (error) {
    console.error('Error persisting financial profile:', error);
  }
}

/**
 * Extract financial snapshot from conversation for profile update
 */
export function extractFinancialSnapshot(conversationText: string): Record<string, any> {
  const snapshot: Record<string, any> = {};

  // Extract income
  const incomeMatch = conversationText.match(/\$?([\d,]+)\s*(?:per month|monthly|income)/i);
  if (incomeMatch) {
    snapshot.monthlyIncome = parseFloat(incomeMatch[1].replace(/,/g, ''));
  }

  // Extract expenses
  const expenseMatch = conversationText.match(/\$?([\d,]+)\s*(?:in expenses?|spend|essentials?)/i);
  if (expenseMatch) {
    snapshot.essentialExpenses = parseFloat(expenseMatch[1].replace(/,/g, ''));
  }

  // Extract savings
  const savingsMatch = conversationText.match(/\$?([\d,]+)\s*(?:in savings?|saved|savings account)/i);
  if (savingsMatch) {
    snapshot.totalSavings = parseFloat(savingsMatch[1].replace(/,/g, ''));
  }

  // Extract debt
  const debtMatch = conversationText.match(/\$?([\d,]+)\s*(?:in debt|owe|credit card debt)/i);
  if (debtMatch) {
    snapshot.totalDebt = parseFloat(debtMatch[1].replace(/,/g, ''));
  }

  return snapshot;
}
