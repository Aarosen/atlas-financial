/**
 * Goal detection from conversation
 * Identifies financial goals mentioned by user or assistant
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';

/**
 * Detect goals from user or assistant message
 */
export function detectGoalsFromMessage(message: string): FinancialGoal[] {
  const goals: FinancialGoal[] = [];
  const lowerMsg = message.toLowerCase();

  // Debt payoff goal detection
  if (lowerMsg.match(/\b(pay off|payoff|eliminate|reduce|credit card|debt|loan)\b/i)) {
    goals.push({
      id: `debt-${Date.now()}`,
      type: 'debt_payoff',
      title: 'Pay off debt',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'high',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Emergency fund detection
  if (lowerMsg.match(/\b(emergency fund|emergency savings|rainy day|safety net|buffer)\b/i)) {
    goals.push({
      id: `emergency-${Date.now()}`,
      type: 'emergency_fund',
      title: 'Build emergency fund',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'high',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Savings goal detection
  if (lowerMsg.match(/\b(save|savings|accumulate|build up)\b/i) && !lowerMsg.match(/emergency/i)) {
    goals.push({
      id: `savings-${Date.now()}`,
      type: 'savings',
      title: 'Build savings',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Investment goal detection
  if (lowerMsg.match(/\b(invest|investment|stock|portfolio|brokerage|index fund)\b/i)) {
    goals.push({
      id: `investment-${Date.now()}`,
      type: 'investment',
      title: 'Start investing',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Retirement goal detection
  if (lowerMsg.match(/\b(retire|retirement|401k|roth|ira|pension)\b/i)) {
    goals.push({
      id: `retirement-${Date.now()}`,
      type: 'retirement',
      title: 'Plan for retirement',
      targetAmount: 0,
      currentAmount: 0,
      status: 'active',
      priority: 'medium',
      deadline: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return goals;
}

/**
 * Check if message contains goal-related keywords
 */
export function messageContainsGoal(message: string): boolean {
  return detectGoalsFromMessage(message).length > 0;
}
