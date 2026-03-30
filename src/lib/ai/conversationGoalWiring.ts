/**
 * Conversation goal wiring
 * Connects goal detection to addNewGoal calls and persists financial profile
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';
import { detectGoalsFromMessage } from './goalDetection';

/**
 * Process assistant response for goals and trigger addNewGoal if detected
 */
export async function processResponseForGoals(
  response: string,
  addNewGoal: (goal: FinancialGoal) => void,
  userId?: string,
  token?: string
): Promise<void> {
  try {
    const detectedGoals = detectGoalsFromMessage(response);
    for (const goal of detectedGoals) {
      addNewGoal(goal);
      
      // FIX 4: Wire goal persistence to user_goals table
      if (userId && userId !== 'guest') {
        try {
          await fetch('/api/goals/save', {
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
        } catch (error) {
          console.error('Error persisting goal to database:', error);
        }
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
