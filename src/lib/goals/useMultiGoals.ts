import { useCallback, useState } from 'react';
import type { FinancialGoal } from './multiGoalTypes';
import { 
  initializeMultiGoalState, 
  addGoal, 
  updateGoalStatus, 
  getCurrentPhaseGoals,
  buildMultiGoalContext,
  detectGoalFromMessage,
  type MultiGoalState
} from './multiGoalOrchestrator';

/**
 * Hook to manage multi-goal state in conversation
 */
export function useMultiGoals(initialGoals: FinancialGoal[] = []) {
  const [state, setState] = useState<MultiGoalState>(() => 
    initializeMultiGoalState(initialGoals)
  );

  const addNewGoal = useCallback((goal: FinancialGoal) => {
    setState(prev => addGoal(prev, goal));
  }, []);

  const updateGoal = useCallback((goalId: string, status: FinancialGoal['status']) => {
    setState(prev => updateGoalStatus(prev, goalId, status));
  }, []);

  const getCurrentGoals = useCallback(() => {
    return getCurrentPhaseGoals(state);
  }, [state]);

  const getContext = useCallback(() => {
    return buildMultiGoalContext(state);
  }, [state]);

  const detectGoal = useCallback((message: string) => {
    return detectGoalFromMessage(message, state);
  }, [state]);

  return {
    state,
    addNewGoal,
    updateGoal,
    getCurrentGoals,
    getContext,
    detectGoal,
  };
}
