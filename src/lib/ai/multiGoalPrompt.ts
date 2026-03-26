/**
 * Multi-goal context injection for system prompt
 * Injects all active goals and current focus into Claude's context
 */

import type { FinancialGoal } from '@/lib/goals/multiGoalTypes';
import { buildMultiGoalContext } from '@/lib/goals/multiGoalOrchestrator';
import type { MultiGoalState } from '@/lib/goals/multiGoalOrchestrator';

/**
 * Build multi-goal context block for system prompt injection
 * Similar to [CALCULATION_RESULTS] and [ATLAS_USER_PROFILE] blocks
 */
export function buildMultiGoalContextBlock(goals: FinancialGoal[]): string {
  if (!goals || goals.length === 0) {
    return '';
  }

  // Create a minimal MultiGoalState for context building
  const state: MultiGoalState = {
    goals,
    waterfall: { goals, phases: [], currentPhaseIndex: 0 },
    focusGoal: goals.find(g => g.status === 'active') || null,
    currentPhaseIndex: 0,
  };

  const context = buildMultiGoalContext(state);
  
  if (!context) {
    return '';
  }

  return `[MULTI_GOAL_CONTEXT]
${context}
[/MULTI_GOAL_CONTEXT]`;
}

/**
 * Format goals for display in conversation
 */
export function formatGoalsForDisplay(goals: FinancialGoal[]): string {
  if (!goals || goals.length === 0) {
    return 'No active goals yet.';
  }

  const activeGoals = goals.filter(g => g.status === 'active');
  if (activeGoals.length === 0) {
    return 'No active goals currently.';
  }

  const lines = activeGoals.map(goal => {
    const progress = goal.currentAmount && goal.targetAmount 
      ? `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% complete`
      : 'progress TBD';
    
    return `${goal.title} (${progress})`;
  });

  return lines.join('\n');
}

/**
 * Check if user message references any goal
 */
export function messageReferencesGoal(message: string, goals: FinancialGoal[]): FinancialGoal | null {
  const lowerMessage = message.toLowerCase();

  for (const goal of goals) {
    // Check title match
    if (goal.title && lowerMessage.includes(goal.title.toLowerCase())) {
      return goal;
    }

    // Check description match
    if (goal.description && lowerMessage.includes(goal.description.toLowerCase())) {
      return goal;
    }

    // Check type-based keywords
    if (goal.type === 'debt_payoff' && /debt|loan|credit\s*card|payoff/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'emergency_fund' && /emergency|buffer|rainy\s*day|safety/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'savings' && /sav|goal|target|fund/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'retirement' && /retire|401k|ira|pension|roth/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'investment' && /invest|stock|bond|portfolio|market/.test(lowerMessage)) {
      return goal;
    }
  }

  return null;
}

/**
 * Build a goal-focused response prompt
 * Used when user is discussing a specific goal
 */
export function buildGoalFocusedPrompt(goal: FinancialGoal): string {
  const lines: string[] = [];
  
  lines.push(`The user is discussing their goal: ${goal.title}`);
  
  if (goal.description) {
    lines.push(`Goal description: ${goal.description}`);
  }
  
  if (goal.targetAmount) {
    const progress = goal.currentAmount 
      ? `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}% complete`
      : 'no progress yet';
    lines.push(`Target: $${goal.targetAmount.toLocaleString()} (${progress})`);
  }
  
  if (goal.deadline) {
    lines.push(`Target date: ${goal.deadline}`);
  }
  
  if (goal.monthlyContribution) {
    lines.push(`Monthly contribution: $${goal.monthlyContribution}`);
  }
  
  lines.push(`Priority: ${goal.priority}`);
  lines.push(`Status: ${goal.status}`);
  
  lines.push('\nFocus your response on this specific goal. Use the numbers above to calculate impact and timeline.');
  
  return lines.join('\n');
}
