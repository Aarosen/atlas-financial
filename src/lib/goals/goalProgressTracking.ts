import { createClient } from '@supabase/supabase-js';

/**
 * Update goal progress based on financial snapshot data
 * Called at session end to track progress toward goals
 */
export async function updateGoalProgressFromSnapshot(
  userId: string,
  snapshot: {
    totalSavings?: number;
    totalDebt?: number;
    monthlyIncome?: number;
    essentialExpenses?: number;
  }
) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[goalProgressTracking] Supabase not configured');
      return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active goals for this user
    const { data: goals, error: goalsError } = await supabase
      .from('user_goals')
      .select('id, goal_type, target_amount, current_amount')
      .eq('user_id', userId)
      .eq('status', 'active');

    if (goalsError || !goals) {
      console.error('[goalProgressTracking] Error fetching goals:', goalsError);
      return;
    }

    // Update each goal's current_amount based on snapshot data
    for (const goal of goals) {
      let newCurrentAmount = goal.current_amount || 0;

      // Emergency fund: use total savings as progress
      if (goal.goal_type === 'emergency_fund' && snapshot.totalSavings !== undefined) {
        newCurrentAmount = snapshot.totalSavings;
      }

      // Debt payoff: use inverse of total debt as progress (lower debt = more progress)
      // If target is to pay off $15k debt, and current debt is $10k, progress is $5k
      if (goal.goal_type === 'debt_payoff' && snapshot.totalDebt !== undefined) {
        const targetDebt = goal.target_amount || 0;
        const debtPaid = Math.max(0, targetDebt - snapshot.totalDebt);
        newCurrentAmount = debtPaid;
      }

      // Savings target: use total savings as progress
      if (goal.goal_type === 'savings_target' && snapshot.totalSavings !== undefined) {
        newCurrentAmount = snapshot.totalSavings;
      }

      // Only update if amount changed
      if (newCurrentAmount !== goal.current_amount) {
        const { error: updateError } = await supabase
          .from('user_goals')
          .update({
            current_amount: newCurrentAmount,
          })
          .eq('id', goal.id);

        if (updateError) {
          console.error('[goalProgressTracking] Error updating goal progress:', updateError);
        } else {
          console.log(`[goalProgressTracking] Updated goal ${goal.id} progress to ${newCurrentAmount}`);
        }
      }
    }
  } catch (error) {
    console.error('[goalProgressTracking] Error:', error);
  }
}

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(
  currentAmount: number | null | undefined,
  targetAmount: number | null | undefined
): number {
  if (!targetAmount || targetAmount === 0) return 0;
  const current = currentAmount || 0;
  return Math.min(100, Math.round((current / targetAmount) * 100));
}

/**
 * Determine if goal is on track based on progress and time remaining
 */
export function isGoalOnTrack(
  currentAmount: number | null | undefined,
  targetAmount: number | null | undefined,
  targetDate: string | null | undefined,
  monthlyProgress: number = 0
): boolean {
  if (!targetDate || !targetAmount) return true;

  const now = new Date();
  const target = new Date(targetDate);
  const daysRemaining = Math.max(0, (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const monthsRemaining = daysRemaining / 30;

  const current = currentAmount || 0;
  const amountRemaining = Math.max(0, targetAmount - current);

  // If no monthly progress data, assume linear progress needed
  if (monthlyProgress === 0) {
    const monthlyNeeded = amountRemaining / Math.max(1, monthsRemaining);
    return monthlyNeeded <= 0; // On track if no progress needed
  }

  // Check if current monthly progress is sufficient
  const projectedCompletion = amountRemaining / monthlyProgress;
  return projectedCompletion <= monthsRemaining;
}
