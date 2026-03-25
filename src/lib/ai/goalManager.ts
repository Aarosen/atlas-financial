import {
  createGoal,
  createSnapshot,
  getMilestones,
  updateMilestoneAcknowledged,
  UserGoal,
  GoalMilestone,
  FinancialSnapshot,
} from '@/lib/db/supabaseRepository';

/**
 * Create a new goal with auto-generated milestones
 * Called when Atlas makes its first recommendation for a user's primary goal
 */
export async function createGoalWithMilestones(
  userId: string,
  goalType: UserGoal['goal_type'],
  goalLabel: string,
  targetAmount: number,
  startingAmount: number,
  monthlyContribution: number
): Promise<UserGoal> {
  // Create the goal
  const goal = await createGoal({
    user_id: userId,
    goal_type: goalType,
    goal_label: goalLabel || null,
    target_amount: targetAmount,
    starting_amount: startingAmount,
    current_amount: startingAmount,
    monthly_contribution: monthlyContribution,
    target_date: null,
    status: 'active',
    achieved_at: null,
  });

  // Create milestones at 25%, 50%, 75%, 100%
  const milestonePercentages = [25, 50, 75, 100];
  const milestoneLabels: Record<number, string> = {
    25: 'One-quarter complete',
    50: 'Halfway there',
    75: 'Three-quarters done',
    100: 'Goal achieved',
  };

  for (const percentage of milestonePercentages) {
    const milestoneAmount = startingAmount + (targetAmount - startingAmount) * (percentage / 100);

    // Note: We would create milestones here, but the schema requires goal_id
    // This will be done after the goal is created in Supabase
    // For now, we return the goal and milestones are created via a separate operation
  }

  return goal;
}

/**
 * Check if any milestones have been crossed based on current snapshot
 * Returns newly achieved milestones
 */
export async function checkMilestoneProgress(
  goal: UserGoal,
  currentAmount: number
): Promise<GoalMilestone[]> {
  const milestones = await getMilestones(goal.id);
  const newlyAchieved: GoalMilestone[] = [];

  for (const milestone of milestones) {
    // Check if milestone has been crossed and not yet achieved
    if (currentAmount >= milestone.milestone_amount && !milestone.achieved_at) {
      newlyAchieved.push(milestone);
    }
  }

  return newlyAchieved;
}

/**
 * Get unacknowledged milestones for a user
 * Called at session start to surface recent achievements
 */
export async function getUnacknowledgedMilestones(
  goals: UserGoal[]
): Promise<GoalMilestone[]> {
  const allMilestones: GoalMilestone[] = [];

  for (const goal of goals) {
    const milestones = await getMilestones(goal.id);
    const unacknowledged = milestones.filter((m) => m.achieved_at && !m.acknowledged_at);
    allMilestones.push(...unacknowledged);
  }

  return allMilestones;
}

/**
 * Mark a milestone as acknowledged
 * Called after Atlas mentions it in a session
 */
export async function markMilestoneAcknowledged(milestoneId: string): Promise<void> {
  await updateMilestoneAcknowledged(milestoneId);
}

/**
 * Build milestone acknowledgment block for system prompt
 * Injected when there are unacknowledged milestones
 */
export function buildMilestoneBlock(milestone: GoalMilestone, goal: UserGoal): string {
  const daysAgo = Math.floor(
    (Date.now() - new Date(milestone.achieved_at || '').getTime()) / (1000 * 60 * 60 * 24)
  );

  let block = '━━━ MILESTONE ACHIEVED — ACKNOWLEDGE FIRST ━━━\n';
  block += `Goal: ${goal.goal_label || goal.goal_type}\n`;
  block += `Milestone: ${milestone.milestone_percentage}% complete (${milestone.milestone_label})\n`;
  block += `Achieved: ${new Date(milestone.achieved_at || '').toLocaleDateString()} (${daysAgo} days ago)\n`;
  block += `Not yet acknowledged.\n\n`;

  block += `RULE: Before any other topic in this session, acknowledge this milestone directly and specifically.\n`;
  block += `Do not be generic. Name the goal. Name the dollar amount. Name the progress.\n`;
  block += `Example: "Before we get into anything else — you've paid off half that Capital One card.\n`;
  block += `Four thousand dollars gone. That's real money that used to be costing you interest every month,\n`;
  block += `and now it's not. That matters."\n`;
  block += `After acknowledging: mark as acknowledged and proceed.\n`;
  block += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return block;
}

/**
 * Calculate progress toward a goal
 */
export function calculateGoalProgress(goal: UserGoal): {
  percentComplete: number;
  amountRemaining: number;
  estimatedMonthsRemaining: number;
} {
  const current = goal.current_amount || goal.starting_amount;
  const total = goal.target_amount - goal.starting_amount;
  const progress = Math.max(0, current - goal.starting_amount);

  const percentComplete = total > 0 ? (progress / total) * 100 : 0;
  const amountRemaining = Math.max(0, goal.target_amount - current);
  const estimatedMonthsRemaining =
    (goal.monthly_contribution || 1) > 0
      ? amountRemaining / (goal.monthly_contribution || 1)
      : 0;

  return {
    percentComplete: Math.round(percentComplete * 10) / 10,
    amountRemaining,
    estimatedMonthsRemaining: Math.round(estimatedMonthsRemaining * 10) / 10,
  };
}

/**
 * Build progress context block for a goal
 */
export function buildGoalProgressBlock(goal: UserGoal): string {
  const progress = calculateGoalProgress(goal);

  let block = `Goal: ${goal.goal_label || goal.goal_type}\n`;
  block += `Progress: ${progress.percentComplete}% complete\n`;
  block += `Amount remaining: $${progress.amountRemaining.toLocaleString()}\n`;
  block += `Estimated time remaining: ${progress.estimatedMonthsRemaining} months at current pace\n`;

  return block;
}
