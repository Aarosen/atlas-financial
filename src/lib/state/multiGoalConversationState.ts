/**
 * Multi-goal conversation state extension
 * Extends ConversationState to support multiple simultaneous goals
 */

import type { FinancialGoal } from './types';
import type { MultiGoalState } from '@/lib/goals/multiGoalOrchestrator';
import { initializeMultiGoalState, updateGoalStatus, getCurrentPhaseGoals } from '@/lib/goals/multiGoalOrchestrator';

export interface ConversationStateWithGoals {
  goals: FinancialGoal[];
  multiGoalState: MultiGoalState | null;
  focusGoalId: string | null;
}

/**
 * Initialize multi-goal conversation state
 */
export function initializeMultiGoalConversationState(goals: FinancialGoal[] = []): ConversationStateWithGoals {
  if (goals.length === 0) {
    return {
      goals: [],
      multiGoalState: null,
      focusGoalId: null,
    };
  }

  const multiGoalState = initializeMultiGoalState(goals);
  const focusGoal = multiGoalState.focusGoal;

  return {
    goals,
    multiGoalState,
    focusGoalId: focusGoal?.id || null,
  };
}

/**
 * Add a goal to conversation state
 */
export function addGoalToConversation(
  state: ConversationStateWithGoals,
  goal: FinancialGoal
): ConversationStateWithGoals {
  const updatedGoals = [...state.goals, goal];
  const multiGoalState = initializeMultiGoalState(updatedGoals);

  return {
    goals: updatedGoals,
    multiGoalState,
    focusGoalId: multiGoalState.focusGoal?.id || null,
  };
}

/**
 * Update goal status in conversation state
 */
export function updateGoalInConversation(
  state: ConversationStateWithGoals,
  goalId: string,
  status: FinancialGoal['status']
): ConversationStateWithGoals {
  if (!state.multiGoalState) {
    return state;
  }

  const updatedMultiGoalState = updateGoalStatus(state.multiGoalState, goalId, status);
  const updatedGoals = updatedMultiGoalState.goals;

  return {
    goals: updatedGoals,
    multiGoalState: updatedMultiGoalState,
    focusGoalId: updatedMultiGoalState.focusGoal?.id || null,
  };
}

/**
 * Get current phase goals
 */
export function getCurrentGoalsFromConversation(state: ConversationStateWithGoals): FinancialGoal[] {
  if (!state.multiGoalState) {
    return [];
  }

  return getCurrentPhaseGoals(state.multiGoalState);
}

/**
 * Get focus goal
 */
export function getFocusGoal(state: ConversationStateWithGoals): FinancialGoal | null {
  if (!state.multiGoalState || !state.focusGoalId) {
    return null;
  }

  return state.multiGoalState.goals.find(g => g.id === state.focusGoalId) || null;
}

/**
 * Check if conversation has active goals
 */
export function hasActiveGoals(state: ConversationStateWithGoals): boolean {
  return state.goals.length > 0 && state.multiGoalState !== null;
}

/**
 * Get goal by ID
 */
export function getGoalById(state: ConversationStateWithGoals, goalId: string): FinancialGoal | null {
  return state.goals.find(g => g.id === goalId) || null;
}
