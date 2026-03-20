import type { FinancialProfile } from '@/lib/types/profile';

export interface SavingsGoalResult {
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  gap: number;
  monthlyRequired: number;
  monthsToGoal: number | null;
  onTrack: boolean;
  shortfallPerMonth: number;
}

export function calculateSavingsGoals(p: FinancialProfile): SavingsGoalResult[] {
  if (!p.goals || p.goals.length === 0) return [];

  const surplus =
    (p.monthly_income ?? 0) -
    (p.monthly_fixed_expenses ?? 0) -
    (p.monthly_variable_expenses ?? 0);

  return p.goals
    .filter(g => g.status === 'active')
    .map(goal => {
      const gap = Math.max(0, goal.target_amount - goal.current_amount);
      const targetDate = goal.target_date ? new Date(goal.target_date) : null;
      const monthsUntilTarget = targetDate
        ? Math.max(1, Math.round((targetDate.getTime() - Date.now()) / (30 * 24 * 60 * 60 * 1000)))
        : null;

      const monthlyRequired = monthsUntilTarget
        ? Math.ceil(gap / monthsUntilTarget)
        : Math.ceil(gap / 12);

      const monthsToGoal = surplus > 0 ? gap / surplus : null;
      const onTrack = surplus >= monthlyRequired;
      const shortfallPerMonth = Math.max(0, monthlyRequired - surplus);

      return {
        goalName: goal.type,
        targetAmount: Math.round(goal.target_amount),
        currentAmount: Math.round(goal.current_amount),
        gap: Math.round(gap),
        monthlyRequired: Math.round(monthlyRequired),
        monthsToGoal: monthsToGoal ? Math.round(monthsToGoal * 10) / 10 : null,
        onTrack,
        shortfallPerMonth: Math.round(shortfallPerMonth),
      };
    });
}
