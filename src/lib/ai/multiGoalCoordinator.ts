import { UserGoal, FinancialProfile } from '@/lib/db/supabaseRepository';
import { FINANCIAL_WATERFALL, WaterfallPhase } from './actionSequencer';

/**
 * Coordinate multiple goals using the financial waterfall
 * Determines which goal to prioritize and when to surface secondary goals
 */
export interface GoalCoordination {
  primaryGoal: UserGoal;
  secondaryGoals: UserGoal[];
  currentPhase: WaterfallPhase;
  nextPhaseGoal: UserGoal | null;
  roadmap: GoalRoadmapItem[];
}

export interface GoalRoadmapItem {
  phase: number;
  phaseName: string;
  goal: UserGoal | null;
  status: 'current' | 'queued' | 'future';
  estimatedMonthsToComplete: number;
}

/**
 * Coordinate goals based on financial waterfall
 * Returns a structured roadmap of when each goal should be addressed
 */
export function coordinateGoals(
  goals: UserGoal[],
  profile: FinancialProfile
): GoalCoordination {
  const activeGoals = goals.filter((g) => g.status === 'active');

  if (activeGoals.length === 0) {
    return {
      primaryGoal: null as any,
      secondaryGoals: [],
      currentPhase: FINANCIAL_WATERFALL[0],
      nextPhaseGoal: null,
      roadmap: [],
    };
  }

  // Map goals to waterfall phases
  const goalPhaseMap = mapGoalsToPhases(activeGoals);

  // Find current phase
  const currentPhase = findCurrentPhase(profile, goalPhaseMap);

  // Get primary goal (current phase)
  const primaryGoal = goalPhaseMap.get(currentPhase.phase) || activeGoals[0];

  // Get secondary goals (queued for future phases)
  const secondaryGoals = activeGoals.filter((g) => g.id !== primaryGoal.id);

  // Find next phase goal
  const nextPhase = FINANCIAL_WATERFALL[currentPhase.phase];
  const nextPhaseGoal = nextPhase ? goalPhaseMap.get(nextPhase.phase) || null : null;

  // Build roadmap
  const roadmap = buildGoalRoadmap(goalPhaseMap, currentPhase, activeGoals);

  return {
    primaryGoal,
    secondaryGoals,
    currentPhase,
    nextPhaseGoal,
    roadmap,
  };
}

/**
 * Map goals to waterfall phases based on goal type
 */
function mapGoalsToPhases(goals: UserGoal[]): Map<number, UserGoal> {
  const map = new Map<number, UserGoal>();

  goals.forEach((goal) => {
    let phase = 0;

    switch (goal.goal_type) {
      case 'emergency_fund':
        // Emergency fund is Phase 2 (minimum buffer) or Phase 4 (full fund)
        phase = 2; // Default to Phase 2, can be upgraded to Phase 4
        break;
      case 'debt_payoff':
        // Debt payoff is Phase 3 (high-interest) or Phase 5 (low-interest)
        phase = 3; // Default to Phase 3
        break;
      case 'savings_target':
        // Savings goals are Phase 4 (full emergency fund)
        phase = 4;
        break;
      case 'invest_start':
        // Investing is Phase 6
        phase = 6;
        break;
      default:
        phase = 3; // Default to Phase 3
    }

    map.set(phase, goal);
  });

  return map;
}

/**
 * Find current phase based on profile and goal map
 */
function findCurrentPhase(
  profile: FinancialProfile,
  goalPhaseMap: Map<number, UserGoal>
): WaterfallPhase {
  for (const phase of FINANCIAL_WATERFALL) {
    if (phase.condition(profile)) {
      return phase;
    }
  }
  return FINANCIAL_WATERFALL[FINANCIAL_WATERFALL.length - 1];
}

/**
 * Build a roadmap showing when each goal will be addressed
 */
function buildGoalRoadmap(
  goalPhaseMap: Map<number, UserGoal>,
  currentPhase: WaterfallPhase,
  allGoals: UserGoal[]
): GoalRoadmapItem[] {
  const roadmap: GoalRoadmapItem[] = [];

  FINANCIAL_WATERFALL.forEach((phase) => {
    const goal = goalPhaseMap.get(phase.phase);
    const status =
      phase.phase === currentPhase.phase
        ? 'current'
        : phase.phase > currentPhase.phase
          ? 'queued'
          : 'future';

    const estimatedMonths = goal ? estimateMonthsToComplete(goal) : 0;

    roadmap.push({
      phase: phase.phase,
      phaseName: phase.name,
      goal: goal || null,
      status,
      estimatedMonthsToComplete: estimatedMonths,
    });
  });

  return roadmap;
}

/**
 * Estimate months to complete a goal
 */
function estimateMonthsToComplete(goal: UserGoal): number {
  if (!goal.monthly_contribution || goal.monthly_contribution <= 0) {
    return 0;
  }

  const remaining = Math.max(0, goal.target_amount - (goal.current_amount || goal.starting_amount));
  return remaining / goal.monthly_contribution;
}

/**
 * Build multi-goal context block for system prompt
 */
export function buildMultiGoalBlock(coordination: GoalCoordination): string {
  let block = '━━━ MULTI-GOAL COORDINATION ━━━\n';
  block += `Primary goal (current phase): ${coordination.primaryGoal.goal_label || coordination.primaryGoal.goal_type}\n`;
  block += `Target: $${coordination.primaryGoal.target_amount.toLocaleString()}\n`;
  block += `Monthly contribution: $${coordination.primaryGoal.monthly_contribution?.toLocaleString() || 'TBD'}\n\n`;

  if (coordination.secondaryGoals.length > 0) {
    block += `Secondary goals (queued for future phases):\n`;
    coordination.secondaryGoals.forEach((goal) => {
      block += `- ${goal.goal_label || goal.goal_type}: $${goal.target_amount.toLocaleString()}\n`;
    });
    block += '\n';
  }

  block += `RULE: If user asks about secondary goals, acknowledge them and explain when they will be addressed.\n`;
  block += `Example: "Investing is absolutely on the roadmap. Once this card is gone — about 3 months\n`;
  block += `at this pace — that's when we shift there. I've noted it. We won't lose track of it."\n`;
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

/**
 * Build secondary goal acknowledgment block
 */
export function buildSecondaryGoalAcknowledgmentBlock(goal: UserGoal, targetPhase: WaterfallPhase): string {
  let block = '━━━ SECONDARY GOAL DETECTED ━━━\n';
  block += `Goal: ${goal.goal_label || goal.goal_type}\n`;
  block += `Target amount: $${goal.target_amount.toLocaleString()}\n`;
  block += `Current phase: Not yet active\n`;
  block += `Will be addressed in: Phase ${targetPhase.phase} — ${targetPhase.name}\n\n`;

  block += `RULE: Acknowledge the goal. Validate it. Defer it explicitly.\n`;
  block += `Example: "${goal.goal_label || goal.goal_type} is absolutely on the roadmap. Once we complete\n`;
  block += `the current phase, that's when we shift there. I've noted it. We won't lose track of it."\n`;
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}
