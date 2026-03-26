/**
 * Multi-goal support types and interfaces
 * Enables Atlas to manage multiple simultaneous financial goals
 */

export type GoalType = 'debt_payoff' | 'emergency_fund' | 'savings' | 'investment' | 'retirement' | 'other';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

export interface FinancialGoal {
  id: string;
  type: GoalType;
  title: string;
  description?: string;
  targetAmount?: number;
  currentAmount?: number;
  deadline?: string; // ISO date
  priority: GoalPriority;
  status: GoalStatus;
  monthlyContribution?: number;
  createdAt: string; // ISO date
  updatedAt: string; // ISO date
  metadata?: Record<string, any>;
}

export interface GoalWaterfall {
  goals: FinancialGoal[];
  phases: GoalPhase[];
  currentPhaseIndex: number;
}

export interface GoalPhase {
  phaseNumber: number;
  title: string;
  goals: string[]; // goal IDs
  description: string;
  estimatedDuration?: string;
  rationale: string;
}

/**
 * Goal prioritization logic
 * Determines which goals should be focused on in current phase
 */
export function prioritizeGoals(goals: FinancialGoal[]): FinancialGoal[] {
  return goals
    .filter((g) => g.status === 'active')
    .sort((a, b) => {
      // Priority order: critical > high > medium > low
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Within same priority, sort by deadline (earlier first)
      if (a.deadline && b.deadline) {
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;

      // Finally, sort by creation date (older first)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
}

/**
 * Build goal waterfall phases
 * Organizes goals into sequential phases based on financial logic
 */
export function buildGoalWaterfall(goals: FinancialGoal[]): GoalWaterfall {
  const activeGoals = goals.filter((g) => g.status === 'active');
  const phases: GoalPhase[] = [];

  // Phase 1: Crisis/Foundation (debt payoff + emergency fund)
  const crisisGoals = activeGoals.filter((g) => g.type === 'debt_payoff' || g.type === 'emergency_fund');
  if (crisisGoals.length > 0) {
    phases.push({
      phaseNumber: 1,
      title: 'Foundation',
      goals: crisisGoals.map((g) => g.id),
      description: 'Eliminate high-interest debt and build emergency fund',
      estimatedDuration: '6-12 months',
      rationale: 'High-interest debt costs money every month. Emergency fund prevents new debt.',
    });
  }

  // Phase 2: Stability (remaining savings goals)
  const savingsGoals = activeGoals.filter((g) => g.type === 'savings' && !crisisGoals.includes(g));
  if (savingsGoals.length > 0) {
    phases.push({
      phaseNumber: 2,
      title: 'Stability',
      goals: savingsGoals.map((g) => g.id),
      description: 'Build savings and financial buffers',
      estimatedDuration: '3-6 months',
      rationale: 'Savings provide flexibility and reduce financial stress.',
    });
  }

  // Phase 3: Growth (investment and retirement)
  const growthGoals = activeGoals.filter((g) => g.type === 'investment' || g.type === 'retirement');
  if (growthGoals.length > 0) {
    phases.push({
      phaseNumber: 3,
      title: 'Growth',
      goals: growthGoals.map((g) => g.id),
      description: 'Build wealth through investments and retirement savings',
      estimatedDuration: 'Ongoing',
      rationale: 'Long-term wealth building compounds over time.',
    });
  }

  // Phase 4: Optimization (other goals)
  const otherGoals = activeGoals.filter((g) => g.type === 'other' && !phases.some((p) => p.goals.includes(g.id)));
  if (otherGoals.length > 0) {
    phases.push({
      phaseNumber: 4,
      title: 'Optimization',
      goals: otherGoals.map((g) => g.id),
      description: 'Pursue additional financial goals',
      estimatedDuration: 'Variable',
      rationale: 'Once foundation is solid, pursue other goals.',
    });
  }

  return {
    goals: activeGoals,
    phases,
    currentPhaseIndex: 0,
  };
}

/**
 * Get the current focus goal
 * Returns the highest-priority active goal for the current phase
 */
export function getCurrentFocusGoal(waterfall: GoalWaterfall): FinancialGoal | null {
  const currentPhase = waterfall.phases[waterfall.currentPhaseIndex];
  if (!currentPhase) return null;

  const phaseGoals = waterfall.goals.filter((g) => currentPhase.goals.includes(g.id));
  const prioritized = prioritizeGoals(phaseGoals);
  return prioritized[0] || null;
}

/**
 * Check if a phase is complete
 * A phase is complete when all its goals are completed or abandoned
 */
export function isPhaseComplete(phase: GoalPhase, goals: FinancialGoal[]): boolean {
  const phaseGoals = goals.filter((g) => phase.goals.includes(g.id));
  return phaseGoals.every((g) => g.status === 'completed' || g.status === 'abandoned');
}
