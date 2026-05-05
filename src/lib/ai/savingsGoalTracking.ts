/**
 * Savings Goal Tracking
 * Tracks progress toward specific savings goals and provides motivation
 */

export interface SavingsGoal {
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: number; // months
  category: 'emergency_fund' | 'vacation' | 'down_payment' | 'education' | 'vehicle' | 'other';
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface SavingsGoalProgress {
  goal: SavingsGoal;
  percentComplete: number;
  amountRemaining: number;
  monthsRemaining: number;
  monthlyRequired: number;
  isOnTrack: boolean;
  motivationalMessage: string;
}

export interface SavingsGoalPlan {
  goals: SavingsGoal[];
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  progressByGoal: SavingsGoalProgress[];
  recommendations: string[];
  guidance: string;
}

/**
 * Calculate progress for a single savings goal
 */
export function calculateGoalProgress(
  goal: SavingsGoal,
  monthlyAvailableSurplus: number
): SavingsGoalProgress {
  const amountRemaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const percentComplete = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 100;
  const monthlyRequired = goal.deadline > 0 ? Math.ceil(amountRemaining / goal.deadline) : 0;
  const isOnTrack = monthlyAvailableSurplus >= monthlyRequired;

  let motivationalMessage = '';
  if (percentComplete >= 100) {
    motivationalMessage = `🎉 Goal achieved! You've reached your ${goal.name} target.`;
  } else if (percentComplete >= 75) {
    motivationalMessage = `🏁 Almost there! You're ${Math.round(percentComplete)}% of the way to your ${goal.name}.`;
  } else if (percentComplete >= 50) {
    motivationalMessage = `💪 Halfway there! Keep up the momentum on your ${goal.name}.`;
  } else if (percentComplete >= 25) {
    motivationalMessage = `📈 Good start! You've saved ${Math.round(percentComplete)}% of your ${goal.name} target.`;
  } else if (percentComplete > 0) {
    motivationalMessage = `✨ Every dollar counts! You're building toward your ${goal.name}.`;
  } else {
    motivationalMessage = `🚀 Time to start saving for your ${goal.name}!`;
  }

  if (!isOnTrack && amountRemaining > 0) {
    motivationalMessage += ` You need $${monthlyRequired}/month to reach your goal on time.`;
  }

  return {
    goal,
    percentComplete,
    amountRemaining,
    monthsRemaining: goal.deadline,
    monthlyRequired,
    isOnTrack,
    motivationalMessage,
  };
}

/**
 * Build comprehensive savings goal plan
 */
export function buildSavingsGoalPlan(
  goals: SavingsGoal[],
  monthlyAvailableSurplus: number
): SavingsGoalPlan {
  const progressByGoal = goals.map(goal => calculateGoalProgress(goal, monthlyAvailableSurplus));

  const totalTargetAmount = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentAmount = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  const recommendations = generateRecommendations(progressByGoal, monthlyAvailableSurplus);
  const guidance = buildSavingsGuidance(progressByGoal, monthlyAvailableSurplus, recommendations);

  return {
    goals,
    totalTargetAmount,
    totalCurrentAmount,
    overallProgress,
    progressByGoal,
    recommendations,
    guidance,
  };
}

/**
 * Generate recommendations based on goal progress
 */
function generateRecommendations(
  progressByGoal: SavingsGoalProgress[],
  monthlyAvailableSurplus: number
): string[] {
  const recommendations: string[] = [];

  // Find off-track goals
  const offTrackGoals = progressByGoal.filter(p => !p.isOnTrack && p.amountRemaining > 0);
  if (offTrackGoals.length > 0) {
    const totalRequired = offTrackGoals.reduce((sum, p) => sum + p.monthlyRequired, 0);
    if (totalRequired > monthlyAvailableSurplus) {
      recommendations.push(
        `You're off-track on ${offTrackGoals.length} goal(s). Consider: (1) Increasing income, (2) Reducing expenses, or (3) Extending deadlines.`
      );
    }
  }

  // Find completed goals
  const completedGoals = progressByGoal.filter(p => p.percentComplete >= 100);
  if (completedGoals.length > 0) {
    recommendations.push(
      `Congratulations on completing ${completedGoals.length} goal(s)! Consider redirecting that savings amount to your next priority.`
    );
  }

  // Find critical priority goals
  const criticalGoals = progressByGoal.filter(p => p.goal.priority === 'critical' && p.percentComplete < 100);
  if (criticalGoals.length > 0) {
    recommendations.push(
      `Focus on your critical goals first: ${criticalGoals.map(p => p.goal.name).join(', ')}.`
    );
  }

  // Check if surplus is sufficient for all goals
  const totalRequired = progressByGoal.reduce((sum, p) => sum + p.monthlyRequired, 0);
  if (totalRequired <= monthlyAvailableSurplus && offTrackGoals.length === 0) {
    recommendations.push(
      `Great news! Your monthly surplus of $${monthlyAvailableSurplus} is sufficient to reach all goals on schedule.`
    );
  }

  return recommendations;
}

/**
 * Build savings goal guidance
 */
function buildSavingsGuidance(
  progressByGoal: SavingsGoalProgress[],
  monthlyAvailableSurplus: number,
  recommendations: string[]
): string {
  let guidance = `SAVINGS GOAL TRACKING:

Overall Progress: ${Math.round(progressByGoal[0]?.goal.targetAmount > 0 ? (progressByGoal.reduce((sum, p) => sum + p.goal.currentAmount, 0) / progressByGoal.reduce((sum, p) => sum + p.goal.targetAmount, 0)) * 100 : 0)}%
Monthly Available Surplus: $${monthlyAvailableSurplus}

YOUR GOALS:`;

  // Sort by priority
  const sortedGoals = progressByGoal.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.goal.priority] - priorityOrder[b.goal.priority];
  });

  sortedGoals.forEach(progress => {
    const progressBar = buildProgressBar(progress.percentComplete);
    guidance += `\n\n${progress.goal.name} [${progress.goal.priority.toUpperCase()}]
${progressBar} ${Math.round(progress.percentComplete)}%
Current: $${progress.goal.currentAmount.toLocaleString()} / Target: $${progress.goal.targetAmount.toLocaleString()}
Remaining: $${progress.amountRemaining.toLocaleString()} | Monthly needed: $${progress.monthlyRequired}/month
${progress.isOnTrack ? '✓ On track' : '⚠️ Off track'} | ${progress.motivationalMessage}`;
  });

  if (recommendations.length > 0) {
    guidance += `\n\nRECOMMENDATIONS:`;
    recommendations.forEach((rec, i) => {
      guidance += `\n${i + 1}. ${rec}`;
    });
  }

  return guidance;
}

/**
 * Build a simple progress bar
 */
function buildProgressBar(percentComplete: number): string {
  const filled = Math.round(percentComplete / 10);
  const empty = 10 - filled;
  return `[${Array(filled).fill('█').join('')}${Array(empty).fill('░').join('')}]`;
}

/**
 * Build system prompt context for savings goals
 */
export function buildSavingsGoalContext(plan: SavingsGoalPlan): string {
  const onTrackGoals = plan.progressByGoal.filter(p => p.isOnTrack).length;
  const offTrackGoals = plan.progressByGoal.filter(p => !p.isOnTrack && p.amountRemaining > 0).length;

  return `[SAVINGS_GOAL_CONTEXT]
Total Goals: ${plan.goals.length}
Overall Progress: ${Math.round(plan.overallProgress)}%
On Track: ${onTrackGoals} | Off Track: ${offTrackGoals}
Total Target: $${plan.totalTargetAmount.toLocaleString()}
Total Saved: $${plan.totalCurrentAmount.toLocaleString()}
Remaining: $${(plan.totalTargetAmount - plan.totalCurrentAmount).toLocaleString()}
Guidance: ${plan.guidance}
[END_SAVINGS_GOAL_CONTEXT]`;
}
