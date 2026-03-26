/**
 * Multi-goal orchestrator
 * Coordinates multiple financial goals and determines which to focus on
 */

import type { FinancialGoal, GoalWaterfall } from './multiGoalTypes';
import { buildGoalWaterfall, getCurrentFocusGoal, isPhaseComplete, prioritizeGoals } from './multiGoalTypes';

export interface MultiGoalState {
  goals: FinancialGoal[];
  waterfall: GoalWaterfall;
  focusGoal: FinancialGoal | null;
  currentPhaseIndex: number;
}

/**
 * Initialize multi-goal state from a list of goals
 */
export function initializeMultiGoalState(goals: FinancialGoal[]): MultiGoalState {
  const waterfall = buildGoalWaterfall(goals);
  const focusGoal = getCurrentFocusGoal(waterfall);

  return {
    goals,
    waterfall,
    focusGoal,
    currentPhaseIndex: waterfall.currentPhaseIndex,
  };
}

/**
 * Add a new goal to the multi-goal state
 */
export function addGoal(state: MultiGoalState, goal: FinancialGoal): MultiGoalState {
  const updatedGoals = [...state.goals, goal];
  return initializeMultiGoalState(updatedGoals);
}

/**
 * Update a goal's status
 */
export function updateGoalStatus(
  state: MultiGoalState,
  goalId: string,
  status: FinancialGoal['status']
): MultiGoalState {
  const updatedGoals = state.goals.map((g) => (g.id === goalId ? { ...g, status, updatedAt: new Date().toISOString() } : g));

  const waterfall = buildGoalWaterfall(updatedGoals);
  let currentPhaseIndex = state.currentPhaseIndex;

  // Check if current phase is complete, move to next if so
  const currentPhase = waterfall.phases[currentPhaseIndex];
  if (currentPhase && isPhaseComplete(currentPhase, updatedGoals)) {
    currentPhaseIndex = Math.min(currentPhaseIndex + 1, waterfall.phases.length - 1);
  }

  const focusGoal = getCurrentFocusGoal(waterfall);

  return {
    goals: updatedGoals,
    waterfall,
    focusGoal,
    currentPhaseIndex,
  };
}

/**
 * Get goals for current phase
 */
export function getCurrentPhaseGoals(state: MultiGoalState): FinancialGoal[] {
  const currentPhase = state.waterfall.phases[state.currentPhaseIndex];
  if (!currentPhase) return [];

  return state.goals.filter((g) => currentPhase.goals.includes(g.id));
}

/**
 * Get next phase goals (for preview/planning)
 */
export function getNextPhaseGoals(state: MultiGoalState): FinancialGoal[] {
  const nextPhaseIndex = state.currentPhaseIndex + 1;
  const nextPhase = state.waterfall.phases[nextPhaseIndex];
  if (!nextPhase) return [];

  return state.goals.filter((g) => nextPhase.goals.includes(g.id));
}

/**
 * Build context string for system prompt
 * Describes all active goals and current focus
 */
export function buildMultiGoalContext(state: MultiGoalState): string {
  if (state.goals.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push('ACTIVE FINANCIAL GOALS:');

  // Current phase
  const currentPhase = state.waterfall.phases[state.currentPhaseIndex];
  if (currentPhase) {
    lines.push(`\nPhase ${currentPhase.phaseNumber}: ${currentPhase.title}`);
    lines.push(`${currentPhase.description}`);
    lines.push(`Rationale: ${currentPhase.rationale}`);

    const phaseGoals = state.goals.filter((g) => currentPhase.goals.includes(g.id) && g.status === 'active');
    if (phaseGoals.length > 0) {
      lines.push('\nCurrent focus goals:');
      for (const goal of phaseGoals) {
        const progress = goal.currentAmount && goal.targetAmount ? `${Math.round((goal.currentAmount / goal.targetAmount) * 100)}%` : 'TBD';
        lines.push(`- ${goal.title} (${progress} complete)`);
        if (goal.monthlyContribution) {
          lines.push(`  Monthly contribution: $${goal.monthlyContribution}`);
        }
        if (goal.deadline) {
          lines.push(`  Target date: ${goal.deadline}`);
        }
      }
    }
  }

  // Next phase preview
  const nextPhase = state.waterfall.phases[state.currentPhaseIndex + 1];
  if (nextPhase) {
    lines.push(`\nNext phase: ${nextPhase.title}`);
    lines.push(`${nextPhase.description}`);
  }

  // Completed goals
  const completedGoals = state.goals.filter((g) => g.status === 'completed');
  if (completedGoals.length > 0) {
    lines.push('\nCompleted goals:');
    for (const goal of completedGoals) {
      lines.push(`✓ ${goal.title}`);
    }
  }

  return lines.join('\n');
}

/**
 * Detect if user is discussing a specific goal
 */
export function detectGoalFromMessage(message: string, state: MultiGoalState): FinancialGoal | null {
  const lowerMessage = message.toLowerCase();

  for (const goal of state.goals) {
    const titleMatch = goal.title.toLowerCase().split(/\s+/).some((word) => lowerMessage.includes(word));
    const descriptionMatch = goal.description && goal.description.toLowerCase().split(/\s+/).some((word) => lowerMessage.includes(word));

    if (titleMatch || descriptionMatch) {
      return goal;
    }

    // Type-based matching
    if (goal.type === 'debt_payoff' && /debt|loan|credit\s*card|payoff/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'emergency_fund' && /emergency|buffer|rainy\s*day|safety\s*net/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'savings' && /sav|goal|target/.test(lowerMessage)) {
      return goal;
    }
    if (goal.type === 'retirement' && /retire|401k|ira|pension/.test(lowerMessage)) {
      return goal;
    }
  }

  return null;
}

/**
 * Get goal progress summary
 */
export function getGoalProgressSummary(goal: FinancialGoal): string {
  if (!goal.targetAmount) {
    return `${goal.title}: No target amount set`;
  }

  const current = goal.currentAmount || 0;
  const percent = Math.round((current / goal.targetAmount) * 100);
  const remaining = goal.targetAmount - current;

  if (goal.monthlyContribution && remaining > 0) {
    const monthsNeeded = Math.ceil(remaining / goal.monthlyContribution);
    return `${goal.title}: $${current.toLocaleString()} of $${goal.targetAmount.toLocaleString()} (${percent}%) — ${monthsNeeded} months at $${goal.monthlyContribution}/month`;
  }

  return `${goal.title}: $${current.toLocaleString()} of $${goal.targetAmount.toLocaleString()} (${percent}%)`;
}
